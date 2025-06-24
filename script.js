import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// Firebase Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UI
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");

// Tambah mesej ke skrin
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Ambil key yang aktif & kurang error
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

// Naikkan fail count dalam Firestore
async function incrementFailCount(docId) {
  const keyRef = doc(db, "api_keys", docId);
  await updateDoc(keyRef, {
    failCount: window.incrementCount ? window.incrementCount + 1 : 1
  });
}

// Hantar mesej
async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;
  addMessage(input, "user");
  userInput.value = "";
  addMessage("Typing...", "bot");

  const keys = await fetchActiveKeys();
  if (!keys.length) {
    chatContainer.lastChild.remove();
    addMessage("❌ Tiada API key tersedia. Sila tambah key di Firebase.", "bot");
    return;
  }

  for (let i = 0; i < keys.length; i++) {
    const { id, value } = keys[i];

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${value}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
          messages: [
            { role: "system", content: "You are ANAS GPT, a smart assistant created by Mr Anas Nidir." },
            { role: "user", content: input }
          ],
          max_tokens: 1000
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.choices || !data.choices[0]) {
        throw new Error("Invalid response from AI.");
      }

      chatContainer.lastChild.remove(); // remove Typing...
      const botReply = data.choices[0].message.content || "❌ AI tak beri respon.";
      addMessage(botReply, "bot");
      return; // keluar loop kalau berjaya

    } catch (err) {
      console.warn(`❌ Gagal guna key: ${value}`);
      await incrementFailCount(id); // naikkan fail count
    }
  }

  // Semua key gagal
  chatContainer.lastChild.remove();
  addMessage("❌ Semua key gagal digunakan. Cuba semula nanti.", "bot");
}

// Trigger bila tekan Enter
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
}); 
