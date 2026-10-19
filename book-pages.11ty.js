
const SITE = "https://alamelhada.com";

function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeUrl(value) {
  try {
    if (!value) return "";
    const url = new URL(String(value), SITE);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function arabicSlug(value = "") {
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function bookPath(book) {
  const slug = arabicSlug(book.title || "كتاب");
  return `/books/${slug}/`;
}

function cleanText(value = "") {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function metaDescription(title, author, description) {
  const text = cleanText(description);

  if (text) {
    return text.length > 160
      ? text.slice(0, 157).trimEnd() + "..."
      : text;
  }

  return author
    ? `تعرف على كتاب ${title} للمؤلف ${author}، واطلع على تفاصيله في مكتبة علم الهدى.`
    : `تعرف على كتاب ${title} واطلع على تفاصيله في مكتبة علم الهدى.`;
}

class BookPages {
  data() {
    return {
      pagination: {
        data: "libraryCatalog.books",
        size: 1,
        alias: "book"
      },

      permalink: data =>
        `${bookPath(data.book)}index.html`,

      eleventyComputed: {
        title: data => data.book.title
      }
    };
  }

  render(data) {
    const book = data.book;

    const title = cleanText(book.title) || "كتاب";
    const author = cleanText(book.author);
    const description = cleanText(book.description);
    const category = cleanText(book.category);

    const relatedBooks = (data.libraryCatalog?.books || [])
      .filter(item =>
        (book.id
          ? item.id !== book.id
          : bookPath(item) !== bookPath(book)) &&
        category !== "" &&
        cleanText(item.category) === category
      )
      .slice(0, 12);

    const cover = safeUrl(book.coverUrl || book.cover);
    const pdf = safeUrl(book.pdfUrl);

    const pageUrl = `${SITE}${bookPath(book)}`;
    const pageTitle = `${title}${author ? ` - ${author}` : ""} | علم الهدى`;
    const seoDescription = metaDescription(title, author, description);

    const readerUrl = pdf
      ? `/reader/?url=${encodeURIComponent(pdf)}&title=${encodeURIComponent(title)}`
      : "";

    const schema = {
      "@context": "https://schema.org",
      "@type": "Book",
      name: title,
      url: pageUrl,
      inLanguage: "ar",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": pageUrl
      }
    };

    if (description) {
      schema.description = description;
    }

    if (author) {
      schema.author = {
        "@type": "Person",
        name: author
      };
    }

    if (cover) {
      schema.image = cover;
    }

    if (category) {
      schema.genre = category;
    }

    const jsonLd = JSON.stringify(schema)
      .replace(/</g, "\\u003c");

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">

  <meta name="viewport"
        content="width=device-width,initial-scale=1">

  <title>${escapeHtml(pageTitle)}</title>

  <meta name="description"
        content="${escapeHtml(seoDescription)}">

  <meta name="robots"
        content="index,follow,max-image-preview:large">

  <link rel="canonical"
        href="${escapeHtml(pageUrl)}">

  <meta property="og:type" content="book">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:site_name" content="علم الهدى">

  <meta property="og:title"
        content="${escapeHtml(pageTitle)}">

  <meta property="og:description"
        content="${escapeHtml(seoDescription)}">

  <meta property="og:url"
        content="${escapeHtml(pageUrl)}">

  ${cover ? `
  <meta property="og:image"
        content="${escapeHtml(cover)}">

  <meta property="og:image:alt"
        content="غلاف ${escapeHtml(title)}">
  ` : ""}

  <meta name="twitter:card"
        content="${cover ? "summary_large_image" : "summary"}">

  <meta name="twitter:title"
        content="${escapeHtml(pageTitle)}">

  <meta name="twitter:description"
        content="${escapeHtml(seoDescription)}">

  ${cover ? `
  <meta name="twitter:image"
        content="${escapeHtml(cover)}">
  ` : ""}

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/css/style.css">

  <style>
    .related-books {
      margin-top: 55px;
      text-align: right;
      width: 100%;
    }

    .related-books-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .related-books-title {
      font-size: 24px;
      margin: 0 0 8px;
      line-height: 1.5;
    }

    .related-books-description {
      color: #777;
      font-size: 14px;
      margin: 0;
    }

    .related-books-controls {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }

    .related-books-arrow {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid #ddd;
      background: #fff;
      color: #333;
      cursor: pointer;
      font-size: 21px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .2s, color .2s;
    }

    .related-books-arrow:hover {
      background: #4F9A43;
      color: #fff;
      border-color: #4F9A43;
    }

    .related-books-arrow:disabled {
      opacity: .35;
      cursor: default;
    }

    .related-books-arrow:disabled:hover {
      background: #fff;
      color: #333;
      border-color: #ddd;
    }

    .related-books-track {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      overscroll-behavior-inline: contain;
      -webkit-overflow-scrolling: touch;
      padding: 5px 2px 15px;
      scrollbar-width: none;
    }

    .related-books-track::-webkit-scrollbar {
      display: none;
    }

    .related-book-card {
      flex: 0 0 155px;
      min-width: 0;
      scroll-snap-align: start;
      text-align: center;
      text-decoration: none;
      color: inherit;
      border: 1px solid #e8e8e8;
      border-radius: 15px;
      padding: 12px;
      background: #fff;
      box-sizing: border-box;
      transition: border-color .2s, box-shadow .2s;
    }

    .related-book-card:hover {
      border-color: #4F9A43;
      box-shadow: 0 5px 18px rgba(0,0,0,.07);
    }

    .related-book-cover {
      width: 100%;
      height: 185px;
      object-fit: contain;
      border-radius: 10px;
      display: block;
    }

    .related-book-placeholder {
      width: 100%;
      height: 185px;
      background: #f2f5f1;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4F9A43;
      font-size: 30px;
    }

    .related-book-title {
      font-size: 14px;
      line-height: 1.6;
      margin: 12px 0 8px;
      min-height: 44px;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    .related-book-link {
      display: inline-block;
      color: #4F9A43;
      font-size: 12px;
      font-weight: 600;
    }

    @media (max-width: 600px) {
      .related-books {
        margin-top: 40px;
      }

      .related-books-title {
        font-size: 19px;
      }

      .related-books-description {
        font-size: 12px;
      }

      .related-book-card {
        flex-basis: 135px;
        padding: 9px;
      }

      .related-book-cover,
      .related-book-placeholder {
        height: 165px;
      }

      .related-books-arrow {
        width: 34px;
        height: 34px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .related-books-track {
        scroll-behavior: auto;
      }
    }
  </style>
</head>

<body>

  <main style="
    max-width:850px;
    margin:40px auto;
    padding:24px;
    text-align:center
  ">

    <a href="/books/">العودة إلى الكتب</a>

    <article>

      <h1>${escapeHtml(title)}</h1>

      ${cover ? `
        <img src="${escapeHtml(cover)}"
             alt="غلاف ${escapeHtml(title)}"
             loading="eager"
             decoding="async"
             style="
               max-width:100%;
               max-height:440px;
               object-fit:contain;
               border-radius:16px
             ">
      ` : ""}

      ${author ? `
        <p>المؤلف: ${escapeHtml(author)}</p>
      ` : ""}

      ${category ? `
        <p>التصنيف: ${escapeHtml(category)}</p>
      ` : ""}

      <p style="line-height:2">
        ${escapeHtml(description)}
      </p>

      ${readerUrl ? `
        <a href="${escapeHtml(readerUrl)}"
           style="
             display:inline-block;
             padding:14px 28px;
             background:#4F9A43;
             color:white;
             border-radius:12px;
             text-decoration:none
           ">
          قراءة الكتاب
        </a>
      ` : ""}

    </article>

    ${relatedBooks.length ? `
      <section class="related-books"
               aria-label="كتب من نفس التصنيف">

        <div class="related-books-header">

          <div>
            <h2 class="related-books-title">
              اقرأ أيضًا من نفس التصنيف
            </h2>

            <p class="related-books-description">
              كتب أخرى من تصنيف ${escapeHtml(category)}
            </p>
          </div>

          <div class="related-books-controls">

            <button type="button"
                    class="related-books-arrow"
                    id="relatedBooksPrev"
                    aria-label="الكتب السابقة">
              &#8594;
            </button>

            <button type="button"
                    class="related-books-arrow"
                    id="relatedBooksNext"
                    aria-label="الكتب التالية">
              &#8592;
            </button>

          </div>

        </div>

        <div class="related-books-track"
             id="relatedBooksTrack"
             tabindex="0"
             aria-label="تصفح الكتب المشابهة">

          ${relatedBooks.map(item => {
            const itemTitle = cleanText(item.title) || "كتاب";
            const itemCover = safeUrl(item.coverUrl || item.cover);

            return `
              <a href="${escapeHtml(bookPath(item))}"
                 class="related-book-card">

                ${itemCover ? `
                  <img src="${escapeHtml(itemCover)}"
                       alt="غلاف ${escapeHtml(itemTitle)}"
                       loading="lazy"
                       decoding="async"
                       class="related-book-cover">
                ` : `
                  <div class="related-book-placeholder"
                       aria-hidden="true">
                    &#128218;
                  </div>
                `}

                <h3 class="related-book-title">
                  ${escapeHtml(itemTitle)}
                </h3>

                <span class="related-book-link">
                  عرض الكتاب ←
                </span>

              </a>
            `;
          }).join("")}

        </div>

      </section>

      <script>
        (function () {
          const track = document.getElementById("relatedBooksTrack");
          const prev = document.getElementById("relatedBooksPrev");
          const next = document.getElementById("relatedBooksNext");

          if (!track || !prev || !next) return;

          function step() {
            const card = track.querySelector(".related-book-card");

            if (!card) return 170;

            const styles = getComputedStyle(track);
            const gap = parseFloat(styles.columnGap) || 0;

            return card.getBoundingClientRect().width + gap;
          }

          function updateButtons() {
            const maxScroll = track.scrollWidth - track.clientWidth;
            const current = Math.abs(track.scrollLeft);

            prev.disabled = current <= 2;
            next.disabled = current >= maxScroll - 2;
          }

          prev.addEventListener("click", function () {
            track.scrollBy({
              left: -step(),
              behavior: "smooth"
            });
          });

          next.addEventListener("click", function () {
            track.scrollBy({
              left: step(),
              behavior: "smooth"
            });
          });

          track.addEventListener("scroll", updateButtons, {
            passive: true
          });

          window.addEventListener("resize", updateButtons);

          updateButtons();
        })();
      </script>
    ` : ""}

  </main>

</body>
</html>`;
  }
}

module.exports = BookPages;
