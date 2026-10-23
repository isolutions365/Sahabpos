import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

const dbId = firebaseConfig.firestoreDatabaseId;
// Connect to named database if specified, otherwise connect to default Firestore database
export const db = (dbId && dbId !== '(default)' && dbId.trim() !== '')
  ? getFirestore(app, dbId)
  : getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Attempt anonymous sign-in to satisfy request.auth != null if enabled in Firebase Console
export async function ensureAnonymousAuth(): Promise<void> {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch {
    // Ignore if anonymous auth is not enabled
  }
}

// Initialize Firebase Analytics
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn('Firebase Analytics not supported in current environment:', err);
    });
}


