// Firebase configuration
// ⚠️ REPLACE these values with your own Firebase project credentials
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (or use existing)
// 3. Enable Authentication → Sign-in method → Google
// 4. Enable Cloud Firestore (start in test mode)
// 5. Go to Project Settings → General → Your apps → Web app
// 6. Copy the config values below

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdzgKTdE5Uu4S1gEOzcz_Jc_InG8AucYg",
  authDomain: "polyuserstats.firebaseapp.com",
  projectId: "polyuserstats",
  storageBucket: "polyuserstats.firebasestorage.app",
  messagingSenderId: "383839520115",
  appId: "1:383839520115:web:89c191bf0e3779f476b106"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
