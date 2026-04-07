// CapIAu-Streaming - Firebase Engine
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ⚠️ Configuradas por variáveis de ambiente (Vercel ou .env)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("🔥 CapIAu Firebase Engine Initialized!");
} catch (error) {
  console.error("🔥 CapIAu Firebase Error:", error);
}

export { db, collection, addDoc, getDocs, getDoc, setDoc, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc, serverTimestamp };
