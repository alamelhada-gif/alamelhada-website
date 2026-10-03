import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-WlaXld6UzPkvPrktY0gHkmnEJQPTIiE",
  authDomain: "riwayati-app-26720.firebaseapp.com",
  projectId: "riwayati-app-26720",
  storageBucket: "riwayati-app-26720.firebasestorage.app",
  messagingSenderId: "852768512121",
  appId: "1:852768512121:web:a5167c06137209c2df1ca8",
  measurementId: "G-FF75MLRN3E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const container = document.getElementById("libraryItems");
const categoryContainer = document.getElementById("libraryCategories");
const loading = document.getElementById("libraryLoading");
const empty = document.getElementById("libraryEmpty");

const type = document.body.dataset.libraryType;

let allItems = [];
let activeCategory = "all";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCover(item) {
  return item.coverUrl || item.cover || "";
}

function renderCategories() {
  if (!categoryContainer) return;

  const categories = [
    ...new Set(
      allItems
        .map(item => item.category)
        .filter(Boolean)
    )
  ];

  categoryContainer.innerHTML = `
    <button class="library-category active" data-category="all">
      الكل
    </button>

    ${categories.map(category => `
      <button
        class="library-category"
        data-category="${escapeHtml(category)}"
      >
        ${escapeHtml(category)}
      </button>
    `).join("")}
  `;

  categoryContainer
    .querySelectorAll(".library-category")
    .forEach(button => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;

        categoryContainer
          .querySelectorAll(".library-category")
          .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        renderItems();
      });
    });
}

function renderItems() {
  if (!container) return;

  const items =
    activeCategory === "all"
      ? allItems
      : allItems.filter(
          item => item.category === activeCategory
        );

  if (!items.length) {
    container.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  container.innerHTML = items.map(item => {
    const cover = getCover(item);

    return `
      <article class="library-card">

        ${
          cover
            ? `
              <div class="library-cover">
                <img
                  src="${escapeHtml(cover)}"
                  alt="${escapeHtml(item.title || "")}"
                  loading="lazy"
                >
              </div>
            `
            : ""
        }

        <div class="library-card-content">

          ${
            item.category
              ? `
                <span class="library-card-category">
                  ${escapeHtml(item.category)}
                </span>
              `
              : ""
          }

          <h2>
            ${escapeHtml(item.title || "بدون عنوان")}
          </h2>

          ${
            item.author
              ? `
                <p class="library-author">
                  المؤلف: ${escapeHtml(item.author)}
                </p>
              `
              : ""
          }

          ${
            item.description
              ? `
                <p class="library-description">
                  ${escapeHtml(item.description)}
                </p>
              `
              : ""
          }

          ${
            item.pdfUrl
              ? `
                <a
                  class="library-read-btn"
                  href="${escapeHtml(item.pdfUrl)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${
                    type === "novels"
                      ? "قراءة الرواية"
                      : "قراءة الكتاب"
                  }
                </a>
              `
              : ""
          }

        </div>

      </article>
    `;
  }).join("");
}

async function loadLibrary() {
  if (!container || !type) return;

  try {
    if (loading) {
      loading.hidden = false;
    }

    const snapshot = await getDocs(
      collection(db, type)
    );

    allItems = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(item => item.status === "published");

    allItems.sort((a, b) => {
      const aDate =
        a.publishedAt?.seconds ||
        a.createdAt?.seconds ||
        0;

      const bDate =
        b.publishedAt?.seconds ||
        b.createdAt?.seconds ||
        0;

      return bDate - aDate;
    });

    renderCategories();
    renderItems();

  } catch (error) {
    console.error("Firebase library error:", error);

    container.innerHTML = `
      <p class="library-error">
        تعذر تحميل المحتوى حاليًا. حاول مرة أخرى لاحقًا.
      </p>
    `;

  } finally {
    if (loading) {
      loading.hidden = true;
    }
  }
}

loadLibrary();
