import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import jsonConfig from '../firebase-applet-config.json';

// Variáveis de ambiente NEXT_PUBLIC_FIREBASE_* têm prioridade sobre o firebase-applet-config.json
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || jsonConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || jsonConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || jsonConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || jsonConfig.appId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || jsonConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || jsonConfig.messagingSenderId,
};

const firestoreDatabaseId =
  process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || jsonConfig.firestoreDatabaseId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app); // CRITICAL
export const auth = getAuth(app);
