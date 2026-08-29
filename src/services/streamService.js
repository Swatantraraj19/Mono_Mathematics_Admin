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
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return list.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
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
