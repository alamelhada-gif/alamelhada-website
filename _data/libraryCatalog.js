
const { initializeApp, getApps } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB-WlaXld6UzPkvPrktY0gHkmnEJQPTIiE",
  authDomain: "riwayati-app-26720.firebaseapp.com",
  projectId: "riwayati-app-26720",
  storageBucket: "riwayati-app-26720.firebasestorage.app",
  messagingSenderId: "852768512121",
  appId: "1:852768512121:web:a5167c06137209c2df1ca8"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const db = getFirestore(app);

async function loadCollection(name) {
  const snapshot = await getDocs(collection(db, name));

  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(item => item.status === "published")
    .map(item => ({
      ...item,
      title: item.title || "بدون عنوان",
      author: item.author || "",
      description: item.description || "",
      category: item.category || "",
      cover: item.coverUrl || item.cover || "",
      pdfUrl: item.pdfUrl || ""
    }));
}

module.exports = async function () {
  const [books, novels] = await Promise.all([
    loadCollection("books"),
    loadCollection("novels")
  ]);

  return { books, novels };
};
