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

const STREAMS_COLLECTION = 'streams';

/**
 * Fetch all master streams for an institute.
 * Uses client-side sorting by orderIndex.
 */
export const fetchStreams = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, STREAMS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return list.sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
  } catch (error) {
    console.error('Error fetching streams:', error);
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
      code: streamData.code ? streamData.code.trim().toLowerCase() : streamData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      orderIndex: Number(streamData.orderIndex) || 1,
      applicableClasses: streamData.applicableClasses || 'Class 11, Class 12',
      status: streamData.status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, STREAMS_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error('Error creating stream:', error);
    throw error;
  }
};

/**
 * Update stream.
 */
export const updateStream = async (streamId, updateData) => {
  try {
    const docRef = doc(db, STREAMS_COLLECTION, streamId);
    const sanitizedData = {
      ...updateData,
      orderIndex: Number(updateData.orderIndex) || 1,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, sanitizedData);
    return { id: streamId, ...sanitizedData };
  } catch (error) {
    console.error('Error updating stream:', error);
    throw error;
  }
};

/**
 * Toggle stream status.
 */
export const toggleStreamStatus = async (streamId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateStream(streamId, { status: newStatus });
};

/**
 * Delete a stream.
 */
export const deleteStream = async (streamId) => {
  try {
    const docRef = doc(db, STREAMS_COLLECTION, streamId);
    await deleteDoc(docRef);
    return { id: streamId, success: true };
  } catch (error) {
    console.error('Error deleting stream:', error);
    throw error;
  }
};
