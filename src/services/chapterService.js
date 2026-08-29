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

const CHAPTERS_COLLECTION = 'chapters';

/**
 * Fetch chapters strictly scoped to a specific subject (classSubjectId).
 */
export const fetchChaptersBySubject = async (instituteId = 'mono_math_01', classSubjectId) => {
  if (!classSubjectId) return [];
  try {
    const q = query(
      collection(db, CHAPTERS_COLLECTION),
      where('instituteId', '==', instituteId),
      where('classSubjectId', '==', classSubjectId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return list.sort(
      (a, b) =>
        (Number(a.chapterNumber) || Number(a.orderIndex) || 0) -
        (Number(b.chapterNumber) || Number(b.orderIndex) || 0)
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Backwards compatible fetcher.
 */
export const fetchChapters = async (instituteId = 'mono_math_01', classSubjectId = null) => {
  if (classSubjectId && classSubjectId !== 'all') {
    return fetchChaptersBySubject(instituteId, classSubjectId);
  }
  try {
    const q = query(
      collection(db, CHAPTERS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return list.sort(
      (a, b) =>
        (Number(a.chapterNumber) || Number(a.orderIndex) || 0) -
        (Number(b.chapterNumber) || Number(b.orderIndex) || 0)
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Global Search: Query chapters by name across the entire institute.
 */
export const searchGlobalChapters = async (instituteId = 'mono_math_01', searchText = '') => {
  const trimmed = searchText.trim().toLowerCase();
  if (!trimmed) return [];

  try {
    const q = query(
      collection(db, CHAPTERS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const all = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return all.filter((ch) => (ch.name || '').toLowerCase().includes(trimmed));
  } catch (error) {
    throw error;
  }
};

/**
 * Total chapters count for dashboard.
 */
export const fetchTotalChapterCount = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, CHAPTERS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
};

/**
 * Create a new chapter under a subject.
 */
export const createChapter = async (chapterData, instituteId = 'mono_math_01') => {
  try {
    const existingChapters = await fetchChaptersBySubject(instituteId, chapterData.classSubjectId);
    const isDuplicate = existingChapters.some(
      (ch) =>
        (ch.name || '').toLowerCase() === chapterData.name.trim().toLowerCase() ||
        Number(ch.chapterNumber) === Number(chapterData.chapterNumber)
    );

    if (isDuplicate) {
      throw new Error(`A chapter with name "${chapterData.name}" or Chapter Number #${chapterData.chapterNumber} already exists in this subject.`);
    }

    const docData = {
      name: chapterData.name.trim(),
      chapterNumber: Number(chapterData.chapterNumber) || 1,
      orderIndex: Number(chapterData.chapterNumber) || 1,
      classId: chapterData.classId,
      className: chapterData.className,
      streamId: chapterData.streamId || null,
      streamName: chapterData.streamName || null,
      subjectId: chapterData.subjectId,
      subjectName: chapterData.subjectName,
      classSubjectId: chapterData.classSubjectId,
      status: chapterData.status || 'active',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, CHAPTERS_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    throw error;
  }
};

/**
 * Update chapter details.
 */
export const updateChapter = async (chapterId, updateData, instituteId = 'mono_math_01') => {
  try {
    if (updateData.classSubjectId) {
      const existingChapters = await fetchChaptersBySubject(instituteId, updateData.classSubjectId);
      const isDuplicate = existingChapters.some(
        (ch) =>
          ch.id !== chapterId &&
          ((ch.name || '').toLowerCase() === (updateData.name || '').trim().toLowerCase() ||
            Number(ch.chapterNumber) === Number(updateData.chapterNumber))
      );

      if (isDuplicate) {
        throw new Error(`A chapter with name "${updateData.name}" or Chapter Number #${updateData.chapterNumber} already exists in this subject.`);
      }
    }

    const docRef = doc(db, CHAPTERS_COLLECTION, chapterId);
    const sanitizedData = {
      ...updateData,
      chapterNumber: Number(updateData.chapterNumber) || 1,
      orderIndex: Number(updateData.chapterNumber) || 1,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, sanitizedData);
    return { id: chapterId, ...sanitizedData };
  } catch (error) {
    throw error;
  }
};

/**
 * Toggle chapter active/inactive status.
 */
export const toggleChapterStatus = async (chapterId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  return updateChapter(chapterId, { status: newStatus });
};

/**
 * Delete a chapter with cascade dependency check.
 */
export const deleteChapter = async (chapterId, instituteId = 'mono_math_01') => {
  try {
    const videosQuery = query(
      collection(db, 'videos'),
      where('instituteId', '==', instituteId),
      where('chapterId', '==', chapterId)
    );
    const videosSnap = await getDocs(videosQuery);

    if (!videosSnap.empty) {
      throw new Error(`Cannot delete this chapter because it contains ${videosSnap.size} recorded video(s). Delete or reassign videos first.`);
    }

    const docRef = doc(db, CHAPTERS_COLLECTION, chapterId);
    await deleteDoc(docRef);
    return { id: chapterId, success: true };
  } catch (error) {
    throw error;
  }
};
