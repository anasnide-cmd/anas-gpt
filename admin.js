import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc, setDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const timerDocRef = doc(db, "meta", "reset_timer");
const modelCollection = collection(db, "models");

// Login
document.getElementById("google-login-btn").addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((err) => {
    alert("❌ Login failed: " + err.message);
  });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("panel-section").style.display = "none";
    return;
  }

  const adminSnap = await getDoc(doc(db, "admin", user.email));
  if (adminSnap.exists() && adminSnap.data().active === true) {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("panel-section").style.display = "block";
    loadKeys();
    setupModelListener();
    startResetCountdownFromServer();
  } else {
    alert("❌ Access denied. You are not an admin.");
    signOut(auth);
  }
});

window.logout = () => signOut(auth);

window.showTab = function (id, event) {
  document.querySelectorAll(".tab-section").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btns button").forEach(btn => btn.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");

  if (id === "list-tab") loadKeys();
  if (id === "model-tab") setupModelListener();
  if (id === "chat-tab") loadUserChats();
};

window.addKey = async function () {
  const input = document.getElementById("api-key-input");
  const key = input.value.trim();
  const status = document.getElementById("status");

  if (!key.startsWith("sk-") && !key.startsWith("hf_")) {
    status.textContent = "❌ Must start with sk- or hf_";
    return;
  }

  try {
    await addDoc(collection(db, "api_keys"), {
      value: key,
      active: true,
      failCount: 0
    });
    status.textContent = "✅ Key added!";
    input.value = "";
    loadKeys();
  } catch (err) {
    status.textContent = "❌ Failed to add key.";
  }
};

async function loadKeys() {
  const tbody = document.getElementById("key-table-body");
  const snapshot = await getDocs(collection(db, "api_keys"));
  let i = 1;
  tbody.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (!data || !data.value) return;

    const row = document.createElement("tr");
    if (!data.active) row.classList.add("inactive");
    row.innerHTML = `
      <td>${i++}</td>
      <td>${data.value.slice(0, 10)}...${data.value.slice(-5)}</td>
      <td>${data.active ? "✅ Active" : "❌ Inactive"}</td>
      <td>${data.failCount}</td>
      <td><button onclick="toggleActive('${docSnap.id}', ${data.active})">Toggle</button></td>
      <td><button onclick="deleteKey('${docSnap.id}')">🗑️</button></td>
    `;
    tbody.appendChild(row);
  });
}

window.toggleActive = async function (docId, current) {
  await updateDoc(doc(db, "api_keys", docId), { active: !current });
  loadKeys();
};

window.deleteKey = async function (docId) {
  if (confirm("Delete this key?")) {
    await deleteDoc(doc(db, "api_keys", docId));
    loadKeys();
  }
};

window.resetFailCounts = async function () {
  const snapshot = await getDocs(collection(db, "api_keys"));
  for (const docSnap of snapshot.docs) {
    await updateDoc(doc(db, "api_keys", docSnap.id), { failCount: 0 });
  }
  alert("✅ All failCounts have been reset.");
  loadKeys();
};

async function startResetCountdownFromServer() {
  try {
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    const snap = await getDoc(timerDocRef);
    let lastReset = snap.exists() ? snap.data().lastReset || 0 : 0;

    if (now - lastReset >= twelveHours) {
      const snapshot = await getDocs(collection(db, "api_keys"));
      for (const docSnap of snapshot.docs) {
        await updateDoc(doc(db, "api_keys", docSnap.id), { failCount: 0 });
      }
      await setDoc(timerDocRef, { lastReset: now });
      lastReset = now;
    }

    startCountdown(lastReset + twelveHours);
  } catch (e) {
    console.error("❌ Failed to set auto-reset:", e);
  }
}

function startCountdown(targetTime) {
  const countdown = document.getElementById("countdown");

  function updateTimer() {
    const now = Date.now();
    const remaining = targetTime - now;

    if (remaining <= 0) {
      countdown.innerText = "🔁 Recently reset.";
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    countdown.innerText = `${hours}h ${minutes}m ${seconds}s`;
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

// Model Management
function setupModelListener() {
  const q = query(modelCollection, orderBy("name"));
  onSnapshot(q, (snapshot) => {
    const tbody = document.getElementById("model-table-body");
    tbody.innerHTML = "";
    let i = 1;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      const row = document.createElement("tr");
      if (!data.active) row.classList.add("inactive");

      row.innerHTML = `
        <td>${i++}</td>
        <td>${data.name}</td>
        <td>${data.endpoint}</td>
        <td>${data.active ? "✅ Active" : "❌ Inactive"}</td>
        <td>${data.selected ? "⭐ Main" : `<button onclick="setModelActive('${docSnap.id}')">Set</button>`}</td>
        <td><button onclick="toggleModel('${docSnap.id}', ${data.active})">Toggle</button></td>
        <td><button onclick="deleteModel('${docSnap.id}')">🗑️</button></td>
      `;
      tbody.appendChild(row);
    });
  });
}

window.addModel = async function () {
  const name = document.getElementById("model-name").value.trim();
  const endpoint = document.getElementById("model-endpoint").value.trim();
  const status = document.getElementById("model-status");

  if (!name || !endpoint) {
    status.textContent = "❌ Please enter both name and endpoint.";
    return;
  }

  try {
    await addDoc(modelCollection, {
      name,
      endpoint,
      active: true,
      selected: false
    });
    status.textContent = "✅ Model added!";
    document.getElementById("model-name").value = "";
    document.getElementById("model-endpoint").value = "";
  } catch (err) {
    status.textContent = "❌ Failed to add model.";
  }
};

window.toggleModel = async function (docId, current) {
  await updateDoc(doc(db, "models", docId), { active: !current });
};

window.deleteModel = async function (docId) {
  if (confirm("Are you sure you want to delete this model?")) {
    await deleteDoc(doc(db, "models", docId));
  }
};

window.setModelActive = async function (docId) {
  const snapshot = await getDocs(modelCollection);
  for (const docSnap of snapshot.docs) {
    await updateDoc(doc(db, "models", docSnap.id), { selected: false });
  }
  await updateDoc(doc(db, "models", docId), { selected: true });
};

// View Chats
async function loadUserChats() {
  const chatList = document.getElementById("chat-list");
  const chatMessages = document.getElementById("chat-messages");
  chatList.innerHTML = "<p>Loading user chats...</p>";
  chatMessages.innerHTML = "";

  const usersSnapshot = await getDocs(collection(db, "users"));
  chatList.innerHTML = "";

  usersSnapshot.forEach(async (userDoc) => {
    const userId = userDoc.id;
    const chatsCol = collection(db, "users", userId, "chats");
    const chatsSnapshot = await getDocs(chatsCol);

    chatsSnapshot.forEach(chatDoc => {
      const chatId = chatDoc.id;
      const chatBtn = document.createElement("button");
      chatBtn.style.marginBottom = "10px";
      chatBtn.textContent = `User: ${userId} | Chat: ${chatId}`;
      chatBtn.onclick = () => loadChatMessages(userId, chatId);
      chatList.appendChild(chatBtn);
    });
  });
}

async function loadChatMessages(userId, chatId) {
  const chatMessages = document.getElementById("chat-messages");
  chatMessages.innerHTML = `<h3>💬 Messages from ${userId} | Chat: ${chatId}</h3>`;
  const msgs = collection(db, "users", userId, "chats", chatId, "messages");
  const msgSnapshot = await getDocs(msgs);

  msgSnapshot.forEach(docSnap => {
    const { sender, text, timestamp } = docSnap.data();
    const div = document.createElement("div");
    div.innerHTML = `<p><b>${sender}</b>: ${text}<br/><small>${timestamp?.toDate?.().toLocaleString() || ''}</small></p>`;
    chatMessages.appendChild(div);
  });
        }
