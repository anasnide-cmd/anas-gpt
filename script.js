import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// Firebase Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Chat UI
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function fetchActiveKeys() {
  const snapshot = await getDocs(collection(db, "api_keys"));
  const keys = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.active && data.value && data.failCount < 3) {
      keys.push(data.value);
    }
  });
  return keys;
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;
  addMessage(input, "user");
  userInput.value = "";
  addMessage("Typing...", "bot");

  const keys = await fetchActiveKeys();
  if (!keys.length) {
    addMessage("❌ No API key available.", "bot");
    return;
  }

  const key = keys[0]; // pakai key pertama dulu

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [
          { role: "system", content: "You are ANAS GPT, an assistant created by Mr Anas Nidir." },
          { role: "user", content: input }
        ],
        max_tokens: 1000
      }),
    });

    const data = await res.json();
    chatContainer.lastChild.remove();
    const botReply = data.choices?.[0]?.message?.content || "❌ No response from AI.";
    addMessage(botReply, "bot");

  } catch (err) {
    chatContainer.lastChild.remove();
    addMessage("❌ Gagal hubung ke OpenRouter.", "bot");
    console.error("API error:", err);
  }
}
