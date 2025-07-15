// memory.js

import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { app } from "./config.js";

// Init
const db = getFirestore(app);
const auth = getAuth(app);

// Element
const memoryList = document.getElementById("memory-list");
const keyInput = document.getElementById("new-memory-key");
const valueInput = document.getElementById("new-memory-value");

// Auto load when login
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadMemoryList();
  } else {
    loadLocalMemory();
  }
});

// ✅ Add memory
window.addMemory = async function () {
  const key = keyInput.value.trim();
  const value = valueInput.value.trim();
  if (!key || !value) return alert("Please fill both key and value.");

  const user = auth.currentUser;
  if (user) {
    const ref = doc(db, "users", user.uid, "memory", "default");
    const existing = (await getDoc(ref)).data() || {};
    const newData = { ...existing, [key]: value };
    await setDoc(ref, { text: JSON.stringify(newData) });
  } else {
    // Save to localStorage
    const localData = JSON.parse(localStorage.getItem("anas_memory") || "{}");
    localData[key] = value;
    localStorage.setItem("anas_memory", JSON.stringify(localData));
  }

  keyInput.value = "";
  valueInput.value = "";
  loadMemoryList();
};

// ✅ Load memory
window.loadMemoryList = async function () {
  const user = auth.currentUser;
  memoryList.innerHTML = "";

  if (user) {
    const ref = doc(db, "users", user.uid, "memory", "default");
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      try {
        const data = JSON.parse(docSnap.data().text || "{}");
        renderMemory(data);
      } catch {
        memoryList.innerHTML = "⚠️ Error loading memory.";
      }
    } else {
      memoryList.innerHTML = "No memory found.";
    }
  } else {
    loadLocalMemory();
  }
};

function loadLocalMemory() {
  const localData = JSON.parse(localStorage.getItem("anas_memory") || "{}");
  renderMemory(localData);
}

function renderMemory(data) {
  Object.entries(data).forEach(([key, value]) => {
    const div = document.createElement("div");
    div.innerHTML = `<b>${key}</b>: ${value} <button onclick="deleteMemory('${key}')">❌</button>`;
    memoryList.appendChild(div);
  });
}

// ✅ Delete memory
window.deleteMemory = async function (key) {
  const user = auth.currentUser;

  if (user) {
    const ref = doc(db, "users", user.uid, "memory", "default");
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = JSON.parse(docSnap.data().text || "{}");
      delete data[key];
      await setDoc(ref, { text: JSON.stringify(data) });
    }
  } else {
    const localData = JSON.parse(localStorage.getItem("anas_memory") || "{}");
    delete localData[key];
    localStorage.setItem("anas_memory", JSON.stringify(localData));
  }

  loadMemoryList();
};

