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
 * Fetch all chapters for an institute, optionally filtered by classSubjectId.
 */
export const fetchChapters = async (instituteId = 'mono_math_01', classSubjectId = null) => {
  try {
    const q = query(
      collection(db, CHAPTERS_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    let list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    if (classSubjectId && classSubjectId !== 'all') {
      list = list.filter((item) => item.classSubjectId === classSubjectId);
    }

    // Sort by chapterNumber / orderIndex ascending
    return list.sort((a, b) => (Number(a.chapterNumber) || Number(a.orderIndex) || 0) - (Number(b.chapterNumber) || Number(b.orderIndex) || 0));
  } catch (error) {
    console.error('Error fetching chapters:', error);
    throw error;
  }
};

/**
 * Create a new chapter under a subject.
 */
export const createChapter = async (chapterData, instituteId = 'mono_math_01') => {
  try {
    // 1. Strict Uniqueness Check: Prevent duplicate chapter number or name in the same subject
    const existingChapters = await fetchChapters(instituteId, chapterData.classSubjectId);
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
    console.error('Error creating chapter:', error);
    throw error;
  }
};

/**
 * Update chapter details.
 */
export const updateChapter = async (chapterId, updateData, instituteId = 'mono_math_01') => {
  try {
    // Strict uniqueness check on edit
    if (updateData.classSubjectId) {
      const existingChapters = await fetchChapters(instituteId, updateData.classSubjectId);
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
    console.error('Error updating chapter:', error);
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
export const deleteChapter = async (chapterId) => {
  try {
    // Check if videos exist under this chapter
    const videosQuery = query(
      collection(db, 'videos'),
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
    console.error('Error deleting chapter:', error);
    throw error;
  }
};
