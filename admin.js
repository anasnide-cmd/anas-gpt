 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, updateDoc, addDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const keyList = document.getElementById("key-list");

async function loadKeys() {
  keyList.innerHTML = "<p>Loading...</p>";
  const snapshot = await getDocs(collection(db, "api_keys"));
  keyList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    const div = document.createElement("div");
    div.innerHTML = `
      <p><strong>${data.value}</strong></p>
      Active: <input type="checkbox" ${data.active ? "checked" : ""} onchange="toggleActive('${id}', this.checked)" />
      Fail Count: ${data.failCount}
      <button onclick="resetFailCount('${id}')">Reset</button>
      <hr/>
    `;
    keyList.appendChild(div);
  });
}

window.toggleActive = async (id, active) => {
  const ref = doc(db, "api_keys", id);
  await updateDoc(ref, { active });
  loadKeys();
};

window.resetFailCount = async (id) => {
  const ref = doc(db, "api_keys", id);
  await updateDoc(ref, { failCount: 0 });
  loadKeys();
};

window.addApiKey = async () => {
  const key = document.getElementById("new-key").value.trim();
  if (!key) return alert("Masukkan key baru!");
  await addDoc(collection(db, "api_keys"), {
    value: key,
    active: true,
    failCount: 0
  });
  document.getElementById("new-key").value = "";
  loadKeys();
};

loadKeys();

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

document.getElementById("login-btn").onclick = () => {
  signInWithPopup(auth, provider).catch((err) => {
    alert("Login gagal: " + err.message);
  });
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("login-area").style.display = "none";
    loadKeys();
  } else {
    keyList.innerHTML = "<p>🔒 Sila login untuk akses admin panel.</p>";
  }
});
