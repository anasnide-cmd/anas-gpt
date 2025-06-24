import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.active && data.value && data.failCount < 3) {
      keys.push({ id: docSnap.id, value: data.value });
    }
  });
  return keys;
}

async function incrementFailCount(docId) {
  const keyRef = doc(db, "api_keys", docId);
  await updateDoc(keyRef, { failCount: Math.floor(Math.random() * 2) + 1 }); // random 1–2, nanti kita boleh refine
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
            { role: "system", content: "You are ANAS GPT, an assistant created by Mr Anas Nidir." },
            { role: "user", content: input }
          ],
          max_tokens: 1000
        }),
      });

      const data = await res.json();

      chatContainer.lastChild.remove();
      const botReply = data.choices?.[0]?.message?.content || "❌ Tiada respon dari AI.";
      addMessage(botReply, "bot");
      return;

    } catch (err) {
      console.error("Gagal guna key:", value);
      await incrementFailCount(id); // mark as failed
    }
  }

  chatContainer.lastChild.remove();
  addMessage("❌ Semua key gagal. Cuba lagi nanti.", "bot");
}
