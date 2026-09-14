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
 * Standard PRD boards list for filtering & dropdown selection.
 */
export const STANDARD_BOARDS = [
  { id: 'CBSE', name: 'CBSE' },
  { id: 'BSEB', name: 'BSEB (Bihar Board)' },
  { id: 'ALL', name: 'Both Boards (Common)' },
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
    throw error;
  }
};

/**
 * Fetch all mapped class-subjects, optionally filtered by classId, streamId, and board.
 */
export const fetchClassSubjects = async (
  instituteId = 'mono_math_01',
  classId = null,
  streamId = null,
  board = null
) => {
  try {
    const q = query(
      collection(db, CLASS_SUBJECTS_COLLECTION),
      where('instituteId', '==', instituteId)
    );

    const snapshot = await getDocs(q);
    let list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        board: data.board || 'ALL',
        ...data,
      };
    });

    if (classId && classId !== 'all') {
      list = list.filter((item) => item.classId === classId);
    }

    if (streamId && streamId !== 'all') {
      list = list.filter((item) => item.streamId === streamId);
    }

    if (board && board !== 'all') {
      list = list.filter((item) => (item.board || 'ALL') === board || item.board === 'ALL');
    }

    return list;
  } catch (error) {
    throw error;
  }
};

/**
 * Map a Subject to a Class (Direct for Classes 6-10, with Stream for Classes 11-12) with Board.
 */
export const mapSubjectToClass = async ({
  classId,
  className,
  streamId = null,
  streamName = null,
  subjectName,
  board = 'ALL',
  status = 'active',
}, instituteId = 'mono_math_01') => {
  try {
    const trimmedSubName = subjectName.trim();
    const sanitizedBoard = (board || 'ALL').toUpperCase();

    // 1. Ensure master subject exists
    const masterSubjects = await fetchMasterSubjects(instituteId);
    let matchedMaster = masterSubjects.find(
      (s) => (s.name || '').toLowerCase() === trimmedSubName.toLowerCase()
    );

    if (!matchedMaster) {
      const newMasterData = {
        name: trimmedSubName,
        code: trimmedSubName.substring(0, 3).toUpperCase(),
        status: 'active',
        instituteId,
        createdAt: serverTimestamp(),
      };
      const masterDocRef = await addDoc(collection(db, SUBJECTS_COLLECTION), newMasterData);
      matchedMaster = { id: masterDocRef.id, ...newMasterData };
    }

    // 2. Prevent duplicate mapping in same class context and board
    const existingMappings = await fetchClassSubjects(instituteId, classId, streamId);
    const isAlreadyMapped = existingMappings.some(
      (m) =>
        (m.subjectName || '').toLowerCase() === trimmedSubName.toLowerCase() &&
        (m.board || 'ALL') === sanitizedBoard
    );

    if (isAlreadyMapped) {
      const boardLabel = sanitizedBoard === 'ALL' ? 'Both Boards' : sanitizedBoard;
      const contextLabel = streamName ? `${className} (${streamName}) [${boardLabel}]` : `${className} [${boardLabel}]`;
      throw new Error(`Subject "${trimmedSubName}" is already mapped to ${contextLabel}.`);
    }

    // 3. Create mapping document with board
    const mappingData = {
      classId,
      className,
      streamId: streamId || null,
      streamName: streamName || null,
      subjectId: matchedMaster.id,
      subjectName: matchedMaster.name,
      board: sanitizedBoard,
      status: status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CLASS_SUBJECTS_COLLECTION), mappingData);
    return { id: docRef.id, ...mappingData };
  } catch (error) {
    throw error;
  }
};

/**
 * Update class-subject status or details.
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
 * Remove subject mapping with cascade check.
 */
export const unmapSubjectFromClass = async (classSubjectId, instituteId = 'mono_math_01') => {
  try {
    // Check if chapters exist under this classSubject
    const chaptersQuery = query(
      collection(db, 'chapters'),
      where('instituteId', '==', instituteId),
      where('classSubjectId', '==', classSubjectId)
    );
    const chaptersSnap = await getDocs(chaptersQuery);

    if (!chaptersSnap.empty) {
      throw new Error(`Cannot delete this subject because it contains ${chaptersSnap.size} chapter(s). Delete or reassign chapters first.`);
    }

    const docRef = doc(db, CLASS_SUBJECTS_COLLECTION, classSubjectId);
    await deleteDoc(docRef);
    return { id: classSubjectId, success: true };
  } catch (error) {
    throw error;
  }
};
