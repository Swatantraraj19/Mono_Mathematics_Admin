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

const COLLECTION_NAME = 'streams';

/**
 * Standard streams for Classes 11 & 12 dropdown.
 */
export const STANDARD_STREAMS = [
  'Science',
  'Commerce',
  'Arts',
];

export const STANDARD_STREAM_ORDER = {
  science: 1,
  commerce: 2,
  arts: 3,
};

export const getStreamOrder = (stream) => {
  const nameKey = (stream?.name || '').trim().toLowerCase();
  if (STANDARD_STREAM_ORDER[nameKey] !== undefined) {
    return STANDARD_STREAM_ORDER[nameKey];
  }
  return Number(stream?.orderIndex) || 0;
};

/**
 * Fetch all streams for an institute.
 */
export const fetchStreams = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const correctOrder = getStreamOrder(data);

      // Auto-correct in background if orderIndex in Firestore is mismatched
      if (data.orderIndex !== correctOrder) {
        updateDoc(docSnap.ref, {
          orderIndex: correctOrder,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      return {
        id: docSnap.id,
        ...data,
        orderIndex: correctOrder,
      };
    });

    return list.sort((a, b) => getStreamOrder(a) - getStreamOrder(b));
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new stream.
 */
export const createStream = async (streamData, instituteId = 'mono_math_01') => {
  try {
    const docData = {
      name: streamData.name.trim(),
      slug: streamData.slug || streamData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      orderIndex: Number(streamData.orderIndex) || 0,
      status: streamData.status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing stream.
 */
export const updateStream = async (streamId, updateData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, streamId);
    const sanitizedData = {
      ...updateData,
      orderIndex: Number(updateData.orderIndex) || 0,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, sanitizedData);
    return { id: streamId, ...sanitizedData };
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle stream active/inactive status.
 */
export const toggleStreamStatus = async (streamId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateStream(streamId, { status: newStatus });
};

/**
 * Delete a stream with dependency check.
 */
export const deleteStream = async (streamId, instituteId = 'mono_math_01') => {
  try {
    const subjectsQuery = query(
      collection(db, 'classSubjects'),
      where('instituteId', '==', instituteId),
      where('streamId', '==', streamId)
    );
    const subjectsSnap = await getDocs(subjectsQuery);

    if (!subjectsSnap.empty) {
      throw new Error(`Cannot delete this stream because it has ${subjectsSnap.size} mapped subject(s). Remove mapped subjects first.`);
    }

    const docRef = doc(db, COLLECTION_NAME, streamId);
    await deleteDoc(docRef);
    return { id: streamId, success: true };
  } catch (error) {
    throw error;
  }
};
