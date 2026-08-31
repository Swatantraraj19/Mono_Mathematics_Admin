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
 */
export const fetchStudents = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('role', '==', 'student')
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return list.sort((a, b) => {
      const timeA = a.registeredAt || a.createdAt;
      const timeB = b.registeredAt || b.createdAt;
      const dateA = timeA?.toDate ? timeA.toDate().getTime() : new Date(timeA || 0).getTime();
      const dateB = timeB?.toDate ? timeB.toDate().getTime() : new Date(timeB || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
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
