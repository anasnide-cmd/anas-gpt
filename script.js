
// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import { firebaseConfig } from "./config.js";

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 💬 UI Elements
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const typingIndicator = document.getElementById("typing-indicator");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const modelSelect = document.getElementById("model");

// ✅ Login & Logout
loginBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider).catch((error) => {
    alert("Login failed: " + error.message);
  });
});

logoutBtn.addEventListener("click", () => {
  signOut(auth);
});

// 👤 Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Logged in as:", user.displayName);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInput.disabled = false;
    userInput.placeholder = `Hi ${user.displayName}, ask anything...`;
    loadModels(); // Load models when user logs in
  } else {
    console.log("🚪 Logged out.");
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userInput.disabled = true;
    userInput.placeholder = "Please login to use ANAS GPT";
  }
});

// 🧐 Load available AI models from Firestore
async function loadModels() {
  const q = query(collection(db, "models"), where("active", "==", true));
  const snapshot = await getDocs(q);

  modelSelect.innerHTML = ""; // Clear old options
  let defaultSet = false;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const option = document.createElement("option");
    option.value = data.endpoint;
    option.textContent = data.name + (data.selected ? " ⭐" : "");

    if (data.selected && !defaultSet) {
      option.selected = true;
      defaultSet = true;
    }

    modelSelect.appendChild(option);
  });

  // ✅ Fallback: auto-pilih model pertama jika tiada yang selected
  if (!defaultSet && modelSelect.options.length > 0) {
    modelSelect.options[0].selected = true;
  }
}

// 🤓 Add message to chat
function addMessage(text, sender = "user") {
  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("message-wrapper", sender);

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = sender === "user" ? "🧑" : "🤖";

  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;

  messageWrapper.appendChild(avatar);
  messageWrapper.appendChild(msg);
  chatContainer.appendChild(messageWrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function typeBotMessage(text) {
  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("message-wrapper", "bot");

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = "🤖";

  const msg = document.createElement("div");
  msg.classList.add("message", "bot");
  msg.textContent = "";

  messageWrapper.appendChild(avatar);
  messageWrapper.appendChild(msg);
  chatContainer.appendChild(messageWrapper);

  let i = 0;
  const interval = setInterval(() => {
    if (i < text.length) {
      msg.textContent += text[i++];
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
      clearInterval(interval);
    }
  }, 20);
}

// 🔑 Fetch active keys
async function fetchActiveKeys() {
  const snapshot = await getDocs(collection(db, "api_keys"));
  const keys = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active && data.value && data.failCount < 3) {
      keys.push({ id: docSnap.id, value: data.value });
    }
  });

  return keys;
}

// ❌ Increase failCount randomly
async function incrementFailCount(docId) {
  const keyRef = doc(db, "api_keys", docId);
  await updateDoc(keyRef, {
    failCount: Math.floor(Math.random() * 2) + 1
  });
}

// 📨 Send message
async function sendMessage() {
  const input = userInput.value.trim();
  if (!input || userInput.disabled) return;

  let selectedModel = modelSelect.value;

  // ✅ Auto fallback to first model if none selected
  if (!selectedModel && modelSelect.options.length > 0) {
    selectedModel = modelSelect.options[0].value;
    modelSelect.value = selectedModel;
    console.log("✅ Auto-selected model:", selectedModel);
  }

  addMessage(input, "user");
  userInput.value = "";
  typingIndicator.style.display = "block";

  const keys = await fetchActiveKeys();
  if (!keys.length) {
    typingIndicator.style.display = "none";
    addMessage("❌ No active API keys available. Please add keys in admin panel.", "bot");
    return;
  }

  for (let i = 0; i < keys.length; i++) {
    const { id, value } = keys[i];
    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: "You are ANAS GPT." },
            { role: "user", content: input }
          ],
          max_tokens: 1000
        }),
      });

      const data = await res.json();
      typingIndicator.style.display = "none";

      if (!res.ok || !data.choices || !data.choices[0]) {
        throw new Error(data?.error?.message || "Invalid AI response.");
      }

      typeBotMessage(data.choices[0].message.content || "❌ AI returned no response.");
      return;

    } catch (err) {
      console.warn(`❌ Key failed: ${value} | ${err.message}`);

      if (
        err.message.includes("quota") ||
        err.message.includes("banned") ||
        err.message.includes("token") ||
        err.message.includes("authorization")
      ) {
        await updateDoc(doc(db, "api_keys", id), { active: false });
      } else {
        await incrementFailCount(id);
      }
    }
  }

  typingIndicator.style.display = "none";
  addMessage("❌ All keys failed. Please try again later.", "bot");
}

// ⌨️ Enter key triggers send
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Export send function to make it available globally
window.sendMessage = sendMessage;

// ☐ Toggle sidebar
window.toggleSidebar = function () {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const isOpen = sidebar.classList.toggle("active");
  overlay.style.display = isOpen ? "block" : "none";
};
 
