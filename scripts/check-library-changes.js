
const fs = require("node:fs");
const crypto = require("node:crypto");
const { initializeApp, getApps } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB-WlaXld6UzPkvPrktY0gHkmnEJQPTIiE",
  authDomain: "riwayati-app-26720.firebaseapp.com",
  projectId: "riwayati-app-26720",
  appId: "1:852768512121:web:a5167c06137209c2df1ca8"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const db = getFirestore(app);

async function getPublished(name) {
  const snapshot = await getDocs(collection(db, name));

  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(item => item.status === "published")
    .map(item => ({
      id: item.id,
      title: item.title || "",
      author: item.author || "",
      description: item.description || "",
      category: item.category || "",
      cover: item.coverUrl || item.cover || "",
      pdfUrl: item.pdfUrl || ""
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function main() {
  const [books, novels] = await Promise.all([
    getPublished("books"),
    getPublished("novels")
  ]);

  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify({ books, novels }))
    .digest("hex");

  const file = ".library-content-hash";

  const previous = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").trim()
    : "";

  const changed = fingerprint !== previous;

  console.log(`Published books: ${books.length}`);
  console.log(`Published novels: ${novels.length}`);
  console.log(`Content changed: ${changed}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `changed=${changed}\n`
    );
  }

  if (changed) {
    fs.writeFileSync(file, fingerprint + "\n");
  }
}

main().catch(error => {
  console.error("Library check failed:", error);
  process.exit(1);
});
