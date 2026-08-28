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

const LIVE_CLASSES_COLLECTION = 'liveClasses';

/**
 * Validates whether a URL is a valid Zoom or meeting URL.
 */
export const isValidMeetingUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(trimmed);
};

/**
 * Dynamically computes status based on scheduled date & time in IST timezone.
 * Lifecycle:
 * - Before start: 'upcoming'
 * - During start - end: 'live'
 * - After end: 'completed'
 * - If manually cancelled: 'cancelled'
 */
export const computeLiveClassStatus = (liveClass) => {
  if (liveClass.manualStatus === 'cancelled' || liveClass.status === 'cancelled') {
    return 'cancelled';
  }

  if (!liveClass.date || !liveClass.startTime) {
    return liveClass.status || 'upcoming';
  }

  try {
    const now = new Date();
    // Parse scheduled start and end timestamps
    const [startHours, startMinutes] = (liveClass.startTime || '00:00').split(':').map(Number);
    const startDateTime = new Date(`${liveClass.date}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00`);

    let endDateTime;
    if (liveClass.endTime) {
      const [endHours, endMinutes] = liveClass.endTime.split(':').map(Number);
      endDateTime = new Date(`${liveClass.date}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`);
    } else {
      // Default duration: 1 hour if endTime not specified
      endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    }

    if (now < startDateTime) {
      return 'upcoming';
    } else if (now >= startDateTime && now <= endDateTime) {
      return 'live';
    } else {
      return 'completed';
    }
  } catch (err) {
    return liveClass.status || 'upcoming';
  }
};

/**
 * Fetch live classes for an institute with dynamic status calculation.
 */
export const fetchLiveClasses = async (instituteId = 'mono_math_01') => {
  try {
    const q = query(
      collection(db, LIVE_CLASSES_COLLECTION),
      where('instituteId', '==', instituteId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const currentStatus = computeLiveClassStatus(data);
      return {
        id: docSnap.id,
        ...data,
        computedStatus: currentStatus,
      };
    });

    // Sort: Live first, then Upcoming (soonest first), then Completed/Cancelled
    return list.sort((a, b) => {
      const statusWeight = { live: 1, upcoming: 2, completed: 3, cancelled: 4 };
      const weightA = statusWeight[a.computedStatus] || 5;
      const weightB = statusWeight[b.computedStatus] || 5;

      if (weightA !== weightB) return weightA - weightB;

      // Sort by date + startTime ascending for upcoming/live, descending for completed
      const timeA = new Date(`${a.date}T${a.startTime || '00:00'}`).getTime() || 0;
      const timeB = new Date(`${b.date}T${b.startTime || '00:00'}`).getTime() || 0;

      if (a.computedStatus === 'completed' || a.computedStatus === 'cancelled') {
        return timeB - timeA;
      }
      return timeA - timeB;
    });
  } catch (error) {
    console.error('Error fetching live classes:', error);
    throw error;
  }
};

/**
 * Create a new live class.
 */
export const createLiveClass = async (classData, instituteId = 'mono_math_01') => {
  try {
    if (!classData.title?.trim()) throw new Error('Live class title is required.');
    if (!classData.classId) throw new Error('Academic class is required.');
    if (!classData.subjectId) throw new Error('Subject is required.');
    if (!classData.date) throw new Error('Scheduled date is required.');
    if (!classData.startTime) throw new Error('Start time is required.');
    if (!classData.endTime) throw new Error('End time is required.');
    if (!classData.zoomUrl?.trim()) throw new Error('Zoom meeting URL is required.');

    const docData = {
      title: classData.title.trim(),
      classId: classData.classId,
      className: classData.className,
      streamId: classData.streamId || null,
      streamName: classData.streamName || null,
      subjectId: classData.subjectId,
      subjectName: classData.subjectName,
      classSubjectId: classData.classSubjectId,
      date: classData.date,
      startTime: classData.startTime,
      endTime: classData.endTime,
      zoomUrl: classData.zoomUrl.trim(),
      manualStatus: 'none',
      status: 'upcoming',
      instituteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, LIVE_CLASSES_COLLECTION), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error('Error creating live class:', error);
    throw error;
  }
};

/**
 * Update live class details.
 */
export const updateLiveClass = async (liveClassId, updateData) => {
  try {
    const docRef = doc(db, LIVE_CLASSES_COLLECTION, liveClassId);
    const sanitizedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(docRef, sanitizedData);
    return { id: liveClassId, ...sanitizedData };
  } catch (error) {
    console.error('Error updating live class:', error);
    throw error;
  }
};

/**
 * Mark a live class as Cancelled.
 */
export const cancelLiveClass = async (liveClassId) => {
  try {
    const docRef = doc(db, LIVE_CLASSES_COLLECTION, liveClassId);
    await updateDoc(docRef, {
      manualStatus: 'cancelled',
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
    return { id: liveClassId, success: true };
  } catch (error) {
    console.error('Error cancelling live class:', error);
    throw error;
  }
};

/**
 * Delete a live class.
 */
export const deleteLiveClass = async (liveClassId) => {
  try {
    const docRef = doc(db, LIVE_CLASSES_COLLECTION, liveClassId);
    await deleteDoc(docRef);
    return { id: liveClassId, success: true };
  } catch (error) {
    console.error('Error deleting live class:', error);
    throw error;
  }
};
