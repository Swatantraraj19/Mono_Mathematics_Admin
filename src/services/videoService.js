import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const VIDEOS_COLLECTION = 'videos';

/**
 * Robust YouTube URL parser that extracts video ID from all YouTube URL variants.
 */
export const extractYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
};

/**
 * Fetch videos strictly scoped to a specific chapter and institute.
 * Uses equality filters (==) on instituteId and chapterId so Firestore
 * automatically fulfills this without requiring a composite index.
 * Only the specific chapter's records are transferred over the wire.
 */
export const fetchVideosByChapter = async (instituteId, chapterId) => {
  if (!instituteId) {
    throw new Error('Institute ID is required to fetch videos.');
  }
  if (!chapterId) return [];

  try {
    const q = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('chapterId', '==', chapterId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        ...d,
        board: d.board || 'ALL',
      };
    });

    return list.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
  } catch (error) {
    throw error;
  }
};

export const fetchVideos = fetchVideosByChapter;

/**
 * Global Search (V1 Scoped Query):
 * Searches videos across all chapters within the authenticated institute
 * using a bounded Firestore range query with limit(25).
 * NEVER downloads all 1000-1500+ videos to the client.
 */
export const searchGlobalVideos = async (instituteId, searchText = '', maxResults = 25) => {
  if (!instituteId) {
    throw new Error('Institute ID is required for video search.');
  }

  const trimmed = searchText.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();

  try {
    const qLower = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('titleLower', '>=', lower),
      where('titleLower', '<=', lower + '\uf8ff'),
      limit(maxResults)
    );

    const snapshot = await getDocs(qLower);
    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        ...d,
        board: d.board || 'ALL',
      };
    });
  } catch (error) {
    console.error('Firestore global search error:', error);
    throw error;
  }
};

/**
 * Fetch total video count for dashboard using Firestore count() aggregation.
 * Zero documents are downloaded to the client.
 */
export const fetchTotalVideoCount = async (instituteId) => {
  if (!instituteId) return 0;
  try {
    const q = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('fetchTotalVideoCount aggregation error:', error);
    return 0;
  }
};

/**
 * Create a new recorded video.
 * Enforces validation of all required fields before writing to Firestore.
 * Automatically computes and persists titleLower for high-efficiency indexed searches.
 */
export const createVideo = async (videoData, instituteId) => {
  if (!instituteId) {
    throw new Error('Institute ID is required to create a video lecture.');
  }

  if (!videoData.title || !videoData.title.trim()) {
    throw new Error('Video lecture title is required.');
  }

  if (!videoData.classId) {
    throw new Error('Class selection is required.');
  }

  if (!videoData.subjectId) {
    throw new Error('Subject selection is required.');
  }

  if (!videoData.chapterId) {
    throw new Error('Chapter selection is required.');
  }

  const videoId = extractYouTubeVideoId(videoData.videoUrl);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Please provide a valid YouTube Unlisted video link.');
  }

  try {
    const titleTrimmed = videoData.title.trim();

    const docData = {
      title: titleTrimmed,
      titleLower: titleTrimmed.toLowerCase(),
      description: (videoData.description || '').trim(),
      videoUrl: videoData.videoUrl.trim(),
      youtubeVideoId: videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: (videoData.duration || '').trim() || 'N/A',
      orderIndex: Number(videoData.orderIndex) || 1,

      classId: videoData.classId,
      className: videoData.className || null,
      streamId: videoData.streamId || null,
      streamName: videoData.streamName || null,
      subjectId: videoData.subjectId,
      subjectName: videoData.subjectName || null,
      chapterId: videoData.chapterId,
      chapterName: videoData.chapterName || null,
      board: videoData.board || 'ALL',

      status: videoData.status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing video.
 * Protects against mass-assignment by explicitly preventing modification of
 * tenant ownership or system immutable fields (instituteId, uid, createdAt, id).
 */
export const updateVideo = async (videoId, updateData) => {
  if (!videoId) {
    throw new Error('Video ID is required for update.');
  }

  try {
    const docRef = doc(db, VIDEOS_COLLECTION, videoId);
    
    // Explicitly whitelist only legitimate editable fields
    const sanitizedData = {};

    if (updateData.title !== undefined) {
      sanitizedData.title = updateData.title.trim();
      sanitizedData.titleLower = updateData.title.trim().toLowerCase();
    }

    if (updateData.description !== undefined) {
      sanitizedData.description = (updateData.description || '').trim();
    }

    if (updateData.videoUrl !== undefined) {
      sanitizedData.videoUrl = updateData.videoUrl.trim();
      const ytId = extractYouTubeVideoId(updateData.videoUrl);
      if (ytId) {
        sanitizedData.youtubeVideoId = ytId;
        sanitizedData.thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }

    if (updateData.duration !== undefined) {
      sanitizedData.duration = (updateData.duration || '').trim() || 'N/A';
    }

    if (updateData.orderIndex !== undefined) {
      sanitizedData.orderIndex = Number(updateData.orderIndex) || 1;
    }

    if (updateData.status !== undefined) {
      sanitizedData.status = updateData.status;
    }

    // Academic Metadata updates
    if (updateData.classId !== undefined) sanitizedData.classId = updateData.classId;
    if (updateData.className !== undefined) sanitizedData.className = updateData.className;
    if (updateData.streamId !== undefined) sanitizedData.streamId = updateData.streamId;
    if (updateData.streamName !== undefined) sanitizedData.streamName = updateData.streamName;
    if (updateData.subjectId !== undefined) sanitizedData.subjectId = updateData.subjectId;
    if (updateData.subjectName !== undefined) sanitizedData.subjectName = updateData.subjectName;
    if (updateData.chapterId !== undefined) sanitizedData.chapterId = updateData.chapterId;
    if (updateData.chapterName !== undefined) sanitizedData.chapterName = updateData.chapterName;
    if (updateData.board !== undefined) sanitizedData.board = updateData.board;

    // Strict tenant/security safeguards: explicitly strip any attempt to overwrite ownership or creation timestamp
    delete sanitizedData.instituteId;
    delete sanitizedData.uid;
    delete sanitizedData.createdAt;
    delete sanitizedData.id;

    sanitizedData.updatedAt = serverTimestamp();

    await updateDoc(docRef, sanitizedData);
    return { id: videoId, ...sanitizedData };
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle video active/inactive status.
 */
export const toggleVideoStatus = async (videoId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateVideo(videoId, { status: newStatus });
};

/**
 * Delete a video.
 */
export const deleteVideo = async (videoId) => {
  if (!videoId) {
    throw new Error('Video ID is required for deletion.');
  }
  try {
    const docRef = doc(db, VIDEOS_COLLECTION, videoId);
    await deleteDoc(docRef);
    return { id: videoId, success: true };
  } catch (error) {
    throw error;
  }
};


