import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* =========================================================
   Firebase
   ========================================================= */

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


/* =========================================================
   أدوات مساعدة
   ========================================================= */

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


function getDateValue(item) {
  return (
    item.publishedAt?.seconds ||
    item.createdAt?.seconds ||
    item.updatedAt?.seconds ||
    0
  );
}


function sortNewest(items) {
  return [...items].sort(
    (a, b) => getDateValue(b) - getDateValue(a)
  );
}


async function getPublishedCollection(collectionName) {
  const snapshot = await getDocs(
    collection(db, collectionName)
  );

  const items = snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(item => item.status === "published");

  return sortNewest(items);
}


/* =========================================================
   صفحات /books/ و /novels/
   ========================================================= */

const libraryContainer =
  document.getElementById("libraryItems");

const categoryContainer =
  document.getElementById("libraryCategories");

const libraryLoading =
  document.getElementById("libraryLoading");

const libraryEmpty =
  document.getElementById("libraryEmpty");

const libraryType =
  document.body.dataset.libraryType;

let allLibraryItems = [];
let activeCategory = "all";


function renderCategories() {
  if (!categoryContainer) return;

  const categories = [
    ...new Set(
      allLibraryItems
        .map(item => item.category)
        .filter(Boolean)
    )
  ];

  categoryContainer.innerHTML = `
    <button
      class="library-category active"
      data-category="all"
      type="button"
    >
      الكل
    </button>

    ${categories.map(category => `
      <button
        class="library-category"
        data-category="${escapeHtml(category)}"
        type="button"
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
          .forEach(btn => {
            btn.classList.remove("active");
          });

        button.classList.add("active");

        renderLibraryItems();

      });

    });
}


function renderLibraryItems() {
  if (!libraryContainer) return;

  const items =
    activeCategory === "all"
      ? allLibraryItems
      : allLibraryItems.filter(
          item => item.category === activeCategory
        );

  if (!items.length) {

    libraryContainer.innerHTML = "";

    if (libraryEmpty) {
      libraryEmpty.hidden = false;
    }

    return;
  }

  if (libraryEmpty) {
    libraryEmpty.hidden = true;
  }

  libraryContainer.innerHTML =
    items.map(item => {

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
                    href="/reader/?url=${encodeURIComponent(item.pdfUrl)}&title=${encodeURIComponent(item.title || "")}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ${
                      libraryType === "novels"
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


async function loadLibraryPage() {

  if (!libraryContainer || !libraryType) {
    return;
  }

  try {

    if (libraryLoading) {
      libraryLoading.hidden = false;
    }

    allLibraryItems =
      await getPublishedCollection(libraryType);

    renderCategories();
    renderLibraryItems();

  } catch (error) {

    console.error(
      "Firebase library error:",
      error
    );

    libraryContainer.innerHTML = `
      <p class="library-error">
        تعذر تحميل المحتوى حاليًا.
        حاول مرة أخرى لاحقًا.
      </p>
    `;

  } finally {

    if (libraryLoading) {
      libraryLoading.hidden = true;
    }

  }
}


/* =========================================================
   سلايدر الصفحة الرئيسية
   ========================================================= */

function createHomeCard(item, type) {

  const cover = getCover(item);

  const label =
    type === "novel"
      ? "رواية"
      : "كتاب";

  return `
    <article class="home-library-card">

      ${
        cover
          ? `
            <div class="home-library-cover">
              <img
                src="${escapeHtml(cover)}"
                alt="${escapeHtml(item.title || "")}"
                loading="lazy"
              >
            </div>
          `
          : `
            <div class="home-library-cover home-library-no-cover">
              ${label}
            </div>
          `
      }

      ${
        item.pdfUrl
          ? `
            <a
              class="home-library-read"
              href="/reader/?url=${encodeURIComponent(item.pdfUrl)}&title=${encodeURIComponent(item.title || "")}"
              target="_blank"
              rel="noopener noreferrer"
            >
              اقرأ ←
            </a>
          `
          : ""
      }

    </article>
  `;
}

function renderHomeSlider(container, items, type) {

  if (!container) return;

  if (!items.length) {

    container.innerHTML = `
      <p class="home-library-empty">
        لا يوجد محتوى منشور حاليًا.
      </p>
    `;

    return;
  }

  container.innerHTML =
    items.map(item =>
      createHomeCard(item, type)
    ).join("");
}

/* =========================================================
   الحركة التلقائية لسلايدر الكتب والروايات
   كل 4 ثوانٍ
   ========================================================= */

function startHomeLibraryAutoSlider(container) {

  if (!container) return;

  setInterval(() => {

    const card =
      container.querySelector(".home-library-card");

    if (!card) return;

    const cardWidth =
      card.getBoundingClientRect().width;

    const maxScroll =
      container.scrollWidth - container.clientWidth;

    if (maxScroll <= 0) return;

    if (container.scrollLeft <= -maxScroll + 5) {

      container.scrollTo({
        left: 0,
        behavior: "smooth"
      });

    } else {

      container.scrollBy({
        left: -cardWidth,
        behavior: "smooth"
      });

    }

  }, 4000);
}

/* =========================================================
   البحث العام
   ========================================================= */

const siteSearchInput =
  document.getElementById("siteSearchInput");

const siteSearchResults =
  document.getElementById("siteSearchResults");

let searchBooks = [];
let searchNovels = [];


function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .trim();
}


function matchesSearch(item, query) {

  const searchable = normalizeText([
    item.title,
    item.author,
    item.category,
    item.description
  ]
    .filter(Boolean)
    .join(" "));

  return searchable.includes(query);
}


function createSearchResult(item, type) {

  const cover = getCover(item);

  const label =
    type === "novel"
      ? "رواية"
      : "كتاب";

  return `
    <a
      class="site-search-result"
      href="${item.pdfUrl
  ? `/reader/?url=${encodeURIComponent(item.pdfUrl)}&title=${encodeURIComponent(item.title || "")}`
  : "#"}"
      ${
        item.pdfUrl
          ? `target="_blank" rel="noopener noreferrer"`
          : ""
      }
    >

      ${
        cover
          ? `
            <img
              src="${escapeHtml(cover)}"
              alt=""
              loading="lazy"
            >
          `
          : ""
      }

      <div>

        <span>
          ${label}
          ${
            item.category
              ? ` • ${escapeHtml(item.category)}`
              : ""
          }
        </span>

        <strong>
          ${escapeHtml(item.title || "بدون عنوان")}
        </strong>

        ${
          item.author
            ? `
              <small>
                ${escapeHtml(item.author)}
              </small>
            `
            : ""
        }

      </div>

    </a>
  `;
}


function searchFirebaseContent(query) {

  if (!siteSearchResults) return;

  if (!query) {

    siteSearchResults.innerHTML = "";
    siteSearchResults.hidden = true;

    return;
  }

  const bookResults =
    searchBooks
      .filter(item => matchesSearch(item, query))
      .slice(0, 6);

  const novelResults =
    searchNovels
      .filter(item => matchesSearch(item, query))
      .slice(0, 6);

  const html = [
    ...novelResults.map(
      item => createSearchResult(item, "novel")
    ),
    ...bookResults.map(
      item => createSearchResult(item, "book")
    )
  ].join("");

  if (!html) {

    siteSearchResults.innerHTML = `
      <div class="site-search-no-results">
        لا توجد نتائج مطابقة.
      </div>
    `;

  } else {

    siteSearchResults.innerHTML = html;

  }

  siteSearchResults.hidden = false;
}


/* =========================================================
   الصفحة الرئيسية
   ========================================================= */

async function loadHomeLibrary() {

  const novelsSlider =
    document.getElementById("homeNovelsTrack");

  const booksSlider =
    document.getElementById("homeBooksTrack");

  const needsHomeData =
    novelsSlider ||
    booksSlider ||
    siteSearchInput;

  if (!needsHomeData) {
    return;
  }

  try {

    const [novels, books] =
      await Promise.all([
        getPublishedCollection("novels"),
        getPublishedCollection("books")
      ]);

    searchNovels = novels;
    searchBooks = books;

    renderHomeSlider(
  novelsSlider,
  novels.slice(0, 10),
  "novel"
);

renderHomeSlider(
  booksSlider,
  books.slice(0, 10),
  "book"
);

    startHomeLibraryAutoSlider(novelsSlider);
startHomeLibraryAutoSlider(booksSlider);
    
    if (siteSearchInput) {

      siteSearchInput.addEventListener(
        "input",
        function () {

          const query =
            normalizeText(this.value);

          searchFirebaseContent(query);

          window.dispatchEvent(
            new CustomEvent(
              "alamelhada-search",
              {
                detail: {
                  query: query
                }
              }
            )
          );

        }
      );

    }

  } catch (error) {

    console.error(
      "Home library error:",
      error
    );

    if (novelsSlider) {
      novelsSlider.innerHTML =
        `<p>تعذر تحميل الروايات حاليًا.</p>`;
    }

    if (booksSlider) {
      booksSlider.innerHTML =
        `<p>تعذر تحميل الكتب حاليًا.</p>`;
    }

  }
}


/* =========================================================
   تشغيل
   ========================================================= */

loadLibraryPage();
loadHomeLibrary();
