import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM
const tableBody = document.getElementById("keys-table-body");
const status = document.getElementById("status");
const input = document.getElementById("api-key-input");

// Fungsi: Papar semua key
async function loadKeys() {
  const snapshot = await getDocs(collection(db, "api_keys"));
  tableBody.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${data.value}</td>
      <td>${data.failCount}</td>
      <td>${data.active ? "✅" : "❌"}</td>
    `;

    tableBody.appendChild(row);
  });
}

// Fungsi: Tambah key baru
window.addKey = async function () {
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
    loadKeys(); // refresh table
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Gagal tambah key.";
  }
};

loadKeys();
