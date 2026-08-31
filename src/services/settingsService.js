import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const SETTINGS_COLLECTION = 'app_settings';

/**
 * Fetch global student app access settings.
 */
export const fetchAppAccessSettings = async (instituteId = 'mono_math_01') => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `${instituteId}_access`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }

    // Default fallback if not yet initialized in Firestore
    return {
      id: `${instituteId}_access`,
      instituteId,
      accessMode: 'open', // 'open' | 'approval'
      updatedAt: null,
    };
  } catch (error) {
    console.error('Error fetching app access settings:', error);
    throw error;
  }
};

/**
 * Update global student app access mode ('open' or 'approval').
 */
export const updateAppAccessMode = async (
  newMode,
  instituteId = 'mono_math_01',
  updatedBy = 'Admin'
) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, `${instituteId}_access`);
    const payload = {
      instituteId,
      accessMode: newMode,
      lastUpdatedBy: updatedBy,
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });
    return { ...payload, updatedAt: new Date() };
  } catch (error) {
    console.error('Error updating app access mode:', error);
    throw error;
  }
};
