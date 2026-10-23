import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : 'ai-studio-sahabpos-db';

// Initialize Firestore instance cleanly with configured named database ID
export const db = getFirestore(app, databaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);


