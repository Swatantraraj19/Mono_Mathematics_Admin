import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
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
 * Fetch videos strictly scoped to a specific chapter.
 * Eliminates downloading the entire institute's video database.
 */
export const fetchVideosByChapter = async (instituteId = 'mono_math_01', chapterId) => {
  if (!chapterId) return [];
  try {
    const q = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('chapterId', '==', chapterId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Client-side sort by orderIndex / lecture number ascending
    return list.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
  } catch (error) {
    console.error('Error fetching chapter videos:', error);
    throw error;
  }
};

export const fetchVideos = fetchVideosByChapter;

/**
 * Global Search: Query videos by title for fast administrative lookup.
 */
export const searchGlobalVideos = async (instituteId = 'mono_math_01', searchText = '') => {
  const trimmed = searchText.trim().toLowerCase();
  if (!trimmed) return [];

  try {
    const q = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return all.filter((v) => (v.title || '').toLowerCase().includes(trimmed));
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

/**
 * Fetch total video count for dashboard or stats.
 */
export const fetchTotalVideoCount = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, VIDEOS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching total video count:', error);
    return 0;
  }
};

/**
 * Create a new recorded video.
 */
export const createVideo = async (videoData, instituteId = 'mono_math_01') => {
  try {
    const videoId = extractYouTubeVideoId(videoData.videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube Unlisted video link.');
    }

    const docData = {
      title: videoData.title.trim(),
      description: (videoData.description || '').trim(),
      videoUrl: videoData.videoUrl.trim(),
      youtubeVideoId: videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: (videoData.duration || '').trim() || 'N/A',
      orderIndex: Number(videoData.orderIndex) || 1,

      // Context hierarchy
      classId: videoData.classId,
      className: videoData.className,
      streamId: videoData.streamId || null,
      streamName: videoData.streamName || null,
      subjectId: videoData.subjectId,
      subjectName: videoData.subjectName,
      chapterId: videoData.chapterId,
      chapterName: videoData.chapterName,

      status: videoData.status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, VIDEOS_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error('Error creating video:', error);
    throw error;
  }
};

/**
 * Update an existing video.
 */
export const updateVideo = async (videoId, updateData) => {
  try {
    const docRef = doc(db, VIDEOS_COLLECTION, videoId);
    const sanitizedData = {
      ...updateData,
      orderIndex: Number(updateData.orderIndex) || 1,
      updatedAt: serverTimestamp(),
    };

    if (updateData.videoUrl) {
      const ytId = extractYouTubeVideoId(updateData.videoUrl);
      if (ytId) {
        sanitizedData.youtubeVideoId = ytId;
        sanitizedData.thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }

    await updateDoc(docRef, sanitizedData);
    return { id: videoId, ...sanitizedData };
  } catch (error) {
    console.error('Error updating video:', error);
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
  try {
    const docRef = doc(db, VIDEOS_COLLECTION, videoId);
    await deleteDoc(docRef);
    return { id: videoId, success: true };
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};
