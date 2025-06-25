// script.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, getDocs, collection, doc, updateDoc, query, where, addDoc, serverTimestamp, deleteDoc, increment
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI Elements
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const typingIndicator = document.getElementById("typing-indicator");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const modelMenu = document.getElementById("model-menu");
const modelInput = document.getElementById("model");
const modelButton = document.getElementById("model-button");
const icon = document.getElementById("dropdown-icon");
const modelNotice = document.getElementById("model-notice");
const clearChatBtn = document.getElementById("clear-chat-btn");
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");

let currentChatId = localStorage.getItem("chatId");

async function startNewChat() {
  const user = auth.currentUser;
  if (!user) return;
  const chatDoc = await addDoc(collection(db, "users", user.uid, "chats"), {
    title: "New Chat",
    createdAt: serverTimestamp()
  });
  currentChatId = chatDoc.id;
  localStorage.setItem("chatId", currentChatId);
}

async function saveMessage(text, sender) {
  const user = auth.currentUser;
  if (!user || !currentChatId) return;
  await addDoc(collection(db, "users", user.uid, "chats", currentChatId, "messages"), {
    text,
    sender,
    timestamp: serverTimestamp()
  });
}

async function loadChatHistory() {
  const user = auth.currentUser;
  if (!user || !currentChatId) return;
  const q = query(collection(db, "users", user.uid, "chats", currentChatId, "messages"));
  const snapshot = await getDocs(q);
  chatContainer.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    addMessage(data.text, data.sender);
  });
}

async function clearChatHistory() {
  const user = auth.currentUser;
  if (!user || !currentChatId) return;
  const chatRef = collection(db, "users", user.uid, "chats", currentChatId, "messages");
  const snapshot = await getDocs(chatRef);
  const deletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletions);
  chatContainer.innerHTML = "";
}

loginBtn.addEventListener("click", () => signInWithPopup(auth, provider).catch(err => alert(`Login failed: ${err.message}`)));

logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    localStorage.removeItem("chatId");
    currentChatId = null;
    chatContainer.innerHTML = "";
  });
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    userInput.disabled = false;
    userInput.placeholder = `Hi ${user.displayName}, ask anything...`;
    if (!currentChatId) await startNewChat();
    loadModels();
    loadChatHistory();
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    userInput.disabled = true;
    userInput.placeholder = "Please login to use ANAS GPT";
  }
});

async function loadModels() {
  const q = query(collection(db,"models"), where("active", "==", true));
  const snapshot = await getDocs(q);
  modelMenu.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.textContent = `${data.name}${data.selected ? " ⭐" : ""}`;
    div.className ="model-option";
    div.onclick= () => {
      modelInput.value= data.endpoint;
      document.getElementById("model-name").textContent= data.name;
      modelMenu.classList.remove("show");
      modelMenu.classList.add("hidden");
      document.querySelectorAll('.model-option').forEach(el => el.classList.remove('active'));
      div.classList.add('active');
    };
    modelMenu.appendChild(div);
    if (data.selected && !modelInput.value) div.click();
  });
  if (!modelInput.value && modelMenu.children.length > 0) {
    modelMenu.children[0].click();
  } else if (!modelInput.value) {
    addMessage("⚠️ No AI model is available at the moment.", "bot");
  }
}

modelButton.addEventListener("click", () => {
  modelMenu.classList.toggle("show");
  modelMenu.classList.toggle("hidden");
  if (icon) icon.style.transform = modelMenu.classList.contains("show") ? "rotate(180deg)" : "rotate(0deg)";
});

document.addEventListener("click", (e) => {
  const isInside = e.target.closest("#model-menu") || e.target.closest("#model-button");
  if (!isInside) {
    modelMenu.classList.remove("show");
    modelMenu.classList.add("hidden");
    if (icon) icon.style.transform = "rotate(0deg)";
  }
});

function addMessage(text, sender = "user") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  saveMessage(text, sender);
}

function typeBotMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message bot";
  msg.textContent = "";
  chatContainer.appendChild(msg);
  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      msg.textContent += text[i++];
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 20);
  saveMessage(text, "bot");
}

async function fetchActiveKeys() {
  const snapshot = await getDocs(collection(db, "api_keys"));
  const keys = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.active && data.value && data.failCount < 3) {
      keys.push({ id: docSnap.id, value: data.value });
    }
  });
  return keys;
}

async function incrementFailCount(docId) {
  await updateDoc(doc(db, "api_keys", docId), {
    failCount: increment(1)
  });
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || userInput.disabled) return;

  userInput.disabled = true;

  let selectedModel = modelInput.value;
  if (!selectedModel) {
    const firstModelDiv = modelMenu.querySelector(".model-option");
    if (firstModelDiv) {
      firstModelDiv.click();
      selectedModel = modelInput.value;
      if (modelNotice) {
        modelNotice.textContent = `🔔 Auto-selected model: ${firstModelDiv.textContent}`;
        modelNotice.classList.add("show");
        setTimeout(() => modelNotice.classList.remove("show"), 3000);
      }
    }
  }

  if (!selectedModel) {
    addMessage("❌ No model selected and no default model found.", "bot");
    userInput.disabled = false;
    return;
  }

  addMessage(input, "user");
  userInput.value = "";
  typingIndicator.classList.remove("hidden");

  const keys = await fetchActiveKeys();
  if (!keys.length) {
    typingIndicator.classList.add("hidden");
    addMessage("❌ No active API keys available.", "bot");
    userInput.disabled = false;
    return;
  }

  for (let { id, value } of keys) {
    try {
      await new Promise(res => setTimeout(res, 300));
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: "You are ANAS GPT." },
            { role: "user", content: input }
          ],
          max_tokens: 1000
        })
      });

      const data = await res.json();
      typingIndicator.classList.add("hidden");

      if (!res.ok || !data?.choices?.[0]) throw new Error(data?.error?.message || "Invalid AI response.");
      typeBotMessage(data.choices[0].message.content || "❌ No response.");
      userInput.disabled = false;
      return;

    } catch (err) {
      console.warn(`❌ Key failed: ${value} | ${err.message}`);
      if (['quota', 'token', 'authorization'].some(keyword => err.message.includes(keyword))) {
        await updateDoc(doc(db, "api_keys", id), { active: false });
      } else {
        await incrementFailCount(id);
      }
    }
  }

  typingIndicator.classList.add("hidden");
  addMessage("❌ All keys failed. Try again later.", "bot");
  userInput.disabled = false;
}

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !userInput.disabled) sendMessage();
});

window.sendMessage = sendMessage;

clearChatBtn.addEventListener("click", () => {
  if (confirm("Padam semua chat?")) {
    clearChatHistory();
  }
});

menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  navMenu.classList.toggle('show');
  navMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest("#nav-menu") && !e.target.closest("#menu-toggle")) {
    navMenu.classList.remove('show');
    navMenu.classList.add('hidden');
  }
});

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
    div.innerHTML = `<p><b>${sender}</b>: ${text} <br/><small>${timestamp?.toDate?.().toLocaleString() || ''}</small></p>`;
    chatMessages.appendChild(div);
  });
}

window.showTab = function(id, event) {
  document.querySelectorAll(".tab-section").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".tab-btns button").forEach(btn => btn.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  event.target.classList.add("active");
};
