// CapIAu-Streaming - Firebase Engine
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';

// ⚠️ REQUIRED: O usuário deve substituir estas chaves pelas suas do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAyPThuxd0QAk3zVrHmxmk3k3eVA88vZ60",
  authDomain: "capiau-streaming.firebaseapp.com",
  projectId: "capiau-streaming",
  storageBucket: "capiau-streaming.firebasestorage.app",
  messagingSenderId: "187412158747",
  appId: "1:187412158747:web:2b7dcad619651bfdde1bbe",
  measurementId: "G-BP230KYGPD"
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

export { db, collection, addDoc, getDocs, onSnapshot, query, where, orderBy, doc, deleteDoc, updateDoc };
