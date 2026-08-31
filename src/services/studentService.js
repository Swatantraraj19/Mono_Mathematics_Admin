import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const USERS_COLLECTION = 'users';

/**
 * Fetch all registered students for an institute.
 * Handles missing collections/indexes gracefully by returning an empty list [].
 */
export const fetchStudents = async (instituteId = 'mono_math_01') => {
  try {
    // Attempt primary compound query
    let snapshot;
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('instituteId', '==', instituteId),
        where('role', '==', 'student')
      );
      snapshot = await getDocs(q);
    } catch (queryErr) {
      // Fallback: Fetch users collection without composite index restriction
      const fallbackQuery = query(
        collection(db, USERS_COLLECTION),
        where('role', '==', 'student')
      );
      snapshot = await getDocs(fallbackQuery);
    }

    if (!snapshot || snapshot.empty) {
      return [];
    }

    const list = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((s) => !s.instituteId || s.instituteId === instituteId);

    return list.sort((a, b) => {
      const timeA = a.registeredAt || a.createdAt;
      const timeB = b.registeredAt || b.createdAt;
      const dateA = timeA?.toDate ? timeA.toDate().getTime() : new Date(timeA || 0).getTime();
      const dateB = timeB?.toDate ? timeB.toDate().getTime() : new Date(timeB || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.warn('Student collection not yet initialized in Firestore:', error?.message);
    return []; // Return empty list gracefully when collection is absent
  }
};

/**
 * Update a student's status ('active', 'pending', 'inactive').
 */
export const updateStudentStatus = async (studentId, newStatus) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, studentId);
    await updateDoc(docRef, {
      status: newStatus,
      statusUpdatedAt: serverTimestamp(),
    });
    return { id: studentId, status: newStatus };
  } catch (error) {
    console.error('Error updating student status:', error);
    throw error;
  }
};

/**
 * Delete a student record from Firestore.
 */
export const deleteStudent = async (studentId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, studentId);
    await deleteDoc(docRef);
    return studentId;
  } catch (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};
