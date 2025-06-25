// chats.js - multi-thread + rename + delete + new chat

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";

// ✅ initialize only once
import { app } from "./config.js";
const db = getFirestore(app);
const auth = getAuth(app);

const chatList = document.getElementById("chat-list");

onAuthStateChanged(auth, async (user) => {
  if (!user) return (chatList.innerHTML = "Please login.");

  const q = query(collection(db, "users", user.uid, "chats"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  chatList.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "chat-item";

    const title = document.createElement("span");
    title.textContent = data.title || "Untitled";
    title.onclick = () => {
      localStorage.setItem("chatId", docSnap.id);
      window.location.href = "index.html";
    };

    const actions = document.createElement("div");
    actions.className = "actions";

    const renameBtn = document.createElement("button");
    renameBtn.textContent = "✏️";
    renameBtn.onclick = async () => {
      const newTitle = prompt("Rename this chat:", data.title || "Untitled");
      if (newTitle) {
        await updateDoc(doc(db, "users", user.uid, "chats", docSnap.id), {
          title: newTitle
        });
        location.reload();
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = async () => {
      const confirmDelete = confirm("Are you sure you want to delete this chat?");
      if (confirmDelete) {
        await deleteDoc(doc(db, "users", user.uid, "chats", docSnap.id));
        location.reload();
      }
    };

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    div.appendChild(title);
    div.appendChild(actions);
    chatList.appendChild(div);
  });
});

// ➕ Start New Chat
window.startNewChat = async function () {
  const user = auth.currentUser;
  if (!user) return alert("Please login.");

  const newChat = await addDoc(collection(db, "users", user.uid, "chats"), {
    title: "Untitled Chat",
    createdAt: serverTimestamp()
  });

  localStorage.setItem("chatId", newChat.id);
  window.location.href = "index.html";
};
