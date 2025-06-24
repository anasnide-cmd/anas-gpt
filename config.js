export const firebaseConfig = {
  apiKey: "AIzaSyDDBmrVIVFfDHIMa-VwcemtBEz54OJMtqc",
  authDomain: "anas-gpt-backend.firebaseapp.com",
  projectId: "anas-gpt-backend",
  storageBucket: "anas-gpt-backend.appspot.com",
  messagingSenderId: "3764495371",
  appId: "1:3764495371:web:bf245b8309853c5fe6d30e",
  measurementId: "G-DWLCNKV7QZ"
};

// Firebase config
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSy........", // Ganti dengan apiKey Firebase anda
  authDomain: "anas-gpt-backend.firebaseapp.com",
  projectId: "anas-gpt-backend",
  storageBucket: "anas-gpt-backend.appspot.com",
  messagingSenderId: "XXXXXX", // optional
  appId: "1:XXXXXX:web:XXXXXX", // optional
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get available API Key
export async function getActiveApiKey() {
  const keysRef = collection(db, "api_keys");
  const querySnapshot = await getDocs(keysRef);
  const availableKeys = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active && data.key) {
      availableKeys.push({ id: docSnap.id, ...data });
    }
  });

  if (availableKeys.length === 0) {
    throw new Error("❌ No active API keys available!");
  }

  // Return random active key
  return availableKeys[Math.floor(Math.random() * availableKeys.length)];
}

// Handle failed key
export async function markKeyAsFailed(keyId) {
  const keyDoc = doc(db, "api_keys", keyId);
  await updateDoc(keyDoc, {
    failCount: 1,
    active: false,
  });
}
