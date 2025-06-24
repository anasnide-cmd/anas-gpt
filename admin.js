import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fungsi tambah key
window.addKey = async function () {
  const input = document.getElementById("api-key-input");
  const status = document.getElementById("status");
  const key = input.value.trim();

  if (!key.startsWith("sk-") && !key.startsWith("hf_")) {
    status.textContent = "❌ Key tidak sah. Mesti bermula dengan sk- atau hf_";
    return;
  }

  try {
    await addDoc(collection(db, "api_keys"), {
      value: key,
      active: true,
      failCount: 0
    });

    status.textContent = "✅ Key berjaya ditambah ke Firebase!";
    input.value = "";
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Gagal tambah key.";
  }
};
