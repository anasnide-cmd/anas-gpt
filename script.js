import { API_KEY } from "./config.js";

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerText = text;
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  const input = userInput.value.trim();
  if (!input) return;
  addMessage(input, "user");
  userInput.value = "";

  addMessage("Typing...", "bot");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      messages: [
        {
          role: "user",
          content: input
        }
      ]
    }),
  });

  const data = await res.json();
  const botReply = data.choices?.[0]?.message?.content || "Error: No response.";
  chatContainer.lastChild.remove(); // Remove "Typing..."
  addMessage(botReply, "bot");
}
