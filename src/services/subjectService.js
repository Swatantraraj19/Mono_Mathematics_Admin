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

const SUBJECTS_COLLECTION = 'subjects';
const CLASS_SUBJECTS_COLLECTION = 'classSubjects';

/**
 * Standard PRD subjects list for dropdown selection.
 */
export const STANDARD_SUBJECTS = [
  'Mathematics',
  'Science',
  'Social Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Accountancy',
  'Economics',
  'Business Studies',
  'History',
  'Political Science',
  'Geography',
  'English',
  'Hindi',
  'Computer Science',
];

/**
 * Fetch all master subjects.
 */
export const fetchMasterSubjects = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, SUBJECTS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } catch (error) {
    console.error('Error fetching master subjects:', error);
    throw error;
  }
};

/**
 * Fetch all mapped class-subjects, optionally filtered by classId and streamId.
 */
export const fetchClassSubjects = async (instituteId = 'mono_math_01', classId = null, streamId = null) => {
  try {
    const q = query(
      collection(db, CLASS_SUBJECTS_COLLECTION),
      where('instituteId', '==', instituteId)
    );

    const snapshot = await getDocs(q);
    let list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    if (classId && classId !== 'all') {
      list = list.filter((item) => item.classId === classId);
    }

    if (streamId && streamId !== 'all') {
      list = list.filter((item) => item.streamId === streamId);
    }

    return list;
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    throw error;
  }
};

/**
 * Map a Subject to a Class (Direct for Classes 6-10, with Stream for Classes 11-12).
 */
export const mapSubjectToClass = async ({
  classId,
  className,
  streamId = null,
  streamName = null,
  subjectName,
  status = 'active',
}, instituteId = 'mono_math_01') => {
  try {
    // 1. Ensure master subject document exists
    const masterQuery = query(
      collection(db, SUBJECTS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('name', '==', subjectName.trim())
    );
    const masterSnap = await getDocs(masterQuery);
    let subjectId;
    if (masterSnap.empty) {
      const newSubjectRef = await addDoc(collection(db, SUBJECTS_COLLECTION), {
        name: subjectName.trim(),
        code: subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        status: 'active',
        instituteId,
        createdAt: serverTimestamp(),
      });
      subjectId = newSubjectRef.id;
    } else {
      subjectId = masterSnap.docs[0].id;
    }

    // 2. Strict Uniqueness: Prevent duplicate subject in the same class and stream
    const existingMapped = await fetchClassSubjects(instituteId, classId, streamId);
    const isDuplicate = existingMapped.some(
      (m) => (m.subjectName || '').toLowerCase() === subjectName.trim().toLowerCase()
    );
    if (isDuplicate) {
      const contextText = streamName ? `${className} (${streamName})` : className;
      throw new Error(`"${subjectName}" is already mapped to ${contextText}. Duplicate subjects are not allowed.`);
    }

    // 3. Save mapping document
    const docData = {
      classId,
      className,
      streamId: streamId || null,
      streamName: streamName || null,
      subjectId,
      subjectName: subjectName.trim(),
      status,
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CLASS_SUBJECTS_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error('Error mapping subject to class:', error);
    throw error;
  }
};

/**
 * Update a class-subject mapping.
 */
export const updateClassSubject = async (classSubjectId, updateData) => {
  try {
    const docRef = doc(db, CLASS_SUBJECTS_COLLECTION, classSubjectId);
    const sanitizedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, sanitizedData);
    return { id: classSubjectId, ...sanitizedData };
  } catch (error) {
    console.error('Error updating class subject:', error);
    throw error;
  }
};

/**
 * Toggle status of a class-subject mapping.
 */
export const toggleClassSubjectStatus = async (classSubjectId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateClassSubject(classSubjectId, { status: newStatus });
};

/**
 * Delete / Unmap a subject with cascade dependency check.
 */
export const unmapSubjectFromClass = async (classSubjectId) => {
  try {
    const chaptersQuery = query(
      collection(db, 'chapters'),
      where('classSubjectId', '==', classSubjectId)
    );
    const chaptersSnap = await getDocs(chaptersQuery);

    if (!chaptersSnap.empty) {
      throw new Error(`Cannot remove this subject because it has ${chaptersSnap.size} chapter(s) created under it. Delete or move chapters first.`);
    }

    const docRef = doc(db, CLASS_SUBJECTS_COLLECTION, classSubjectId);
    await deleteDoc(docRef);
    return { id: classSubjectId, success: true };
  } catch (error) {
    console.error('Error unmapping subject:', error);
    throw error;
  }
};
