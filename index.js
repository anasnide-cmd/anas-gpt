const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.resetFailCounts = functions.pubsub
  .schedule("every 12 hours")
  .onRun(async () => {
    const snapshot = await db.collection("api_keys").get();
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const ref = db.collection("api_keys").doc(doc.id);
      batch.update(ref, { failCount: 0 });
    });

    await batch.commit();
    console.log("✅ Semua failCount telah direset.");
    return null;
  });
  
  menuToggle.addEventListener("click", (e) => {
  e.stopPropagation(); // elak event bubbling
  setTimeout(() => {
    navMenu.classList.toggle("show");
    navMenu.classList.toggle("hidden");
  }, 10);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#nav-menu") && !e.target.closest("#menu-toggle")) {
    navMenu.classList.add("hidden");
    navMenu.classList.remove("show");
  }
});
