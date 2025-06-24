// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  getDocs,
  collection,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// 🔥 Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 💬 Elemen UI
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");

// Tambah mesej ke UI
function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Dapatkan semua API key aktif dan belum banyak gagal
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

// Naikkan failCount jika key gagal digunakan
async function incrementFailCount(docId) {
  const keyRef = doc(db, "api_keys", docId);
  await updateDoc(keyRef, {
    failCount: Math.floor(Math.random() * 2) + 1 // antara 1–2
  });
}

// Fungsi hantar mesej ke AI
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

      chatContainer.lastChild.remove(); // buang "Typing..."
      const botReply = data.choices[0].message.content || "❌ AI tak beri respon.";
      addMessage(botReply, "bot");
      return; // keluar loop bila berjaya

    } catch (err) {
      console.warn(`❌ Gagal guna key: ${value}`);
      await incrementFailCount(id);
    }
  }

  chatContainer.lastChild.remove();
  addMessage("❌ Semua key gagal digunakan. Cuba lagi nanti.", "bot");
}

// Bila tekan Enter, hantar mesej
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
