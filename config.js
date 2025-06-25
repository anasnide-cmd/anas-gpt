// config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDDBmrVIVFfDHIMa-VwcemtBEz54OJMtqc",
  authDomain: "anas-gpt-backend.firebaseapp.com",
  projectId: "anas-gpt-backend",
  storageBucket: "anas-gpt-backend.appspot.com",
  messagingSenderId: "3764495371",
  appId: "1:3764495371:web:bf245b8309853c5fe6d30e",
  measurementId: "G-DWLCNKV7QZ"
};

// ✅ Initialize app dan export
export const app = initializeApp(firebaseConfig);
