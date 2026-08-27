import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Authentication and Admin Authorization Service.
 * Strictly verifies role === 'admin' and status === 'active' from Firestore.
 */
export const authService = {
  /**
   * Log in an administrator and verify admin role in Firestore.
   */
  async login(email, password) {
    // 1. Authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = userCredential.user.uid;

    try {
      // 2. Fetch User Profile from Firestore to verify Admin Authorization
      const profile = await this.fetchUserProfile(uid);

      if (!profile) {
        await signOut(auth);
        throw new Error('Access denied: No administrative profile found for this account.');
      }

      if (profile.role !== 'admin') {
        await signOut(auth);
        throw new Error('Access denied: Only administrators are authorized to access this portal.');
      }

      if (profile.status !== 'active') {
        await signOut(auth);
        throw new Error('Access denied: This administrator account is currently inactive.');
      }

      if (!profile.instituteId) {
        await signOut(auth);
        throw new Error('Access denied: Account is not associated with any institute.');
      }

      return {
        user: userCredential.user,
        profile,
      };
    } catch (err) {
      // If Firestore check fails or throws, ensure auth session is terminated
      await signOut(auth);
      throw err;
    }
  },

  /**
   * Sign out current administrator.
   */
  async logout() {
    return await signOut(auth);
  },

  /**
   * Fetch user document from Firestore `users/{uid}`.
   */
  async fetchUserProfile(uid) {
    if (!uid) return null;
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return null;
    }

    return {
      id: userDocSnap.id,
      ...userDocSnap.data(),
    };
  },
};
