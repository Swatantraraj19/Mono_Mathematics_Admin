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

const COLLECTION_NAME = 'classes';

/**
 * Fetch all classes for an institute.
 */
export const fetchClasses = async (instituteId = 'mono_math_01') => {
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
 * Create a new academic class.
 */
export const createClass = async (classData, instituteId = 'mono_math_01') => {
  try {
    const docData = {
      name: classData.name.trim(),
      slug: classData.slug || classData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      orderIndex: Number(classData.orderIndex) || 0,
      hasStreams: Boolean(classData.hasStreams),
      status: classData.status || 'active',
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
 * Update an existing class.
 */
export const updateClass = async (classId, updateData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId);
    const sanitizedData = {
      ...updateData,
      orderIndex: Number(updateData.orderIndex) || 0,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, sanitizedData);
    return { id: classId, ...sanitizedData };
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle class active/inactive status.
 */
export const toggleClassStatus = async (classId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateClass(classId, { status: newStatus });
};

/**
 * Delete a class with dependency check.
 */
export const deleteClass = async (classId) => {
  try {
    const subjectsQuery = query(
      collection(db, 'classSubjects'),
      where('classId', '==', classId)
    );
    const subjectsSnap = await getDocs(subjectsQuery);

    if (!subjectsSnap.empty) {
      throw new Error(`Cannot delete this class because it has ${subjectsSnap.size} mapped subject(s). Remove mapped subjects first.`);
    }

    const docRef = doc(db, COLLECTION_NAME, classId);
    await deleteDoc(docRef);
    return { id: classId, success: true };
  } catch (error) {
    throw error;
  }
};
