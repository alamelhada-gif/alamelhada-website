
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

function novelPath(novel) {
  const slug = arabicSlug(novel.title || "رواية");
  return `/novels/${slug}/`;
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
    ? `تعرف على رواية ${title} للكاتب ${author}، واقرأ تفاصيلها في مكتبة علم الهدى.`
    : `تعرف على رواية ${title} واقرأ تفاصيلها في مكتبة علم الهدى.`;
}

class NovelPages {
  data() {
    return {
      pagination: {
        data: "libraryCatalog.novels",
        size: 1,
        alias: "novel"
      },

      permalink: data =>
        `${novelPath(data.novel)}index.html`,

      eleventyComputed: {
        title: data => data.novel.title
      }
    };
  }

  render(data) {
    const novel = data.novel;

    const relatedNovels = (data.libraryCatalog?.novels || [])
      .filter(item =>
        item.id !== novel.id &&
        cleanText(item.category) === cleanText(novel.category) &&
        cleanText(novel.category) !== ""
      )
      .slice(0, 6);

    const title = cleanText(novel.title) || "رواية";
    const author = cleanText(novel.author);
    const description = cleanText(novel.description);
    const category = cleanText(novel.category);

    const cover = safeUrl(novel.coverUrl || novel.cover);
    const pdf = safeUrl(novel.pdfUrl);

    const pageUrl = `${SITE}${novelPath(novel)}`;
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
      genre: category || "رواية",
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
    .related-novels {
      margin-top: 55px;
      text-align: right;
      min-width: 0;
    }

    .related-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 20px;
    }

    .related-heading h2 {
      font-size: 23px;
      line-height: 1.5;
      margin: 0 0 8px;
    }

    .related-heading p {
      color: #777;
      font-size: 14px;
      margin: 0;
    }

    .related-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .related-arrow {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e1e1e1;
      border-radius: 50%;
      background: #fff;
      color: #4F9A43;
      font-size: 20px;
      cursor: pointer;
      transition: background .2s, color .2s;
    }

    .related-arrow:hover {
      background: #4F9A43;
      color: #fff;
    }

    .related-arrow:disabled {
      opacity: .35;
      cursor: default;
    }

    .related-track {
      display: flex;
      flex-wrap: nowrap;
      gap: 15px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
      padding: 5px 2px 18px;
      scrollbar-width: thin;
      scrollbar-color: #cbd8c8 transparent;
    }

    .related-card {
      flex: 0 0 160px;
      min-width: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 12px;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 15px;
      text-decoration: none;
      color: inherit;
      scroll-snap-align: start;
      transition: border-color .2s, box-shadow .2s;
    }

    .related-card:hover {
      border-color: #4F9A43;
      box-shadow: 0 5px 18px rgba(0,0,0,.07);
    }

    .related-cover {
      width: 100%;
      height: 185px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .related-cover img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }

    .related-card h3 {
      font-size: 14px;
      line-height: 1.7;
      margin: 12px 0 8px;
      min-height: 48px;
      overflow-wrap: anywhere;
    }

    .related-card span {
      display: inline-block;
      color: #4F9A43;
      font-size: 13px;
      font-weight: 600;
      margin-top: auto;
    }

    @media (max-width: 600px) {
      .related-novels {
        margin-top: 40px;
      }

      .related-heading h2 {
        font-size: 18px;
      }

      .related-heading p {
        font-size: 12px;
      }

      .related-arrow {
        width: 34px;
        height: 34px;
      }

      .related-track {
        gap: 12px;
      }

      .related-card {
        flex-basis: 145px;
      }

      .related-cover {
        height: 175px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .related-track {
        scroll-behavior: auto;
      }

      .related-card,
      .related-arrow {
        transition: none;
      }
    }
  </style>
</head>

<body>
  <main style="max-width:850px;margin:40px auto;padding:24px;text-align:center">

    <a href="/novels/">العودة إلى الروايات</a>

    <article>
      <h1>${escapeHtml(title)}</h1>

      ${cover ? `
        <img src="${escapeHtml(cover)}"
             alt="غلاف ${escapeHtml(title)}"
             loading="eager"
             decoding="async"
             style="max-width:100%;max-height:440px;object-fit:contain;border-radius:16px">
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
           style="display:inline-block;padding:14px 28px;background:#4F9A43;color:white;border-radius:12px;text-decoration:none">
          قراءة الرواية
        </a>
      ` : ""}

    </article>

    ${relatedNovels.length ? `
      <section class="related-novels"
               aria-label="روايات من نفس التصنيف">

        <div class="related-heading">
          <div>
            <h2>اقرأ أيضًا من نفس التصنيف</h2>
            <p>روايات أخرى من تصنيف ${escapeHtml(category)}</p>
          </div>

          <div class="related-controls">
            <button type="button"
                    class="related-arrow"
                    data-direction="prev"
                    aria-label="الروايات السابقة">
              ❯
            </button>

            <button type="button"
                    class="related-arrow"
                    data-direction="next"
                    aria-label="الروايات التالية">
              ❮
            </button>
          </div>
        </div>

        <div class="related-track"
             role="region"
             aria-label="روايات مقترحة من نفس التصنيف"
             tabindex="0">

          ${relatedNovels.map(item => {
            const itemTitle = cleanText(item.title) || "رواية";
            const itemCover = safeUrl(item.coverUrl || item.cover);

            return `
              <a class="related-card"
                 href="${escapeHtml(novelPath(item))}">

                <div class="related-cover">
                  ${itemCover ? `
                    <img src="${escapeHtml(itemCover)}"
                         alt="غلاف ${escapeHtml(itemTitle)}"
                         loading="lazy"
                         decoding="async">
                  ` : ""}
                </div>

                <h3>${escapeHtml(itemTitle)}</h3>

                <span>عرض الرواية ←</span>
              </a>
            `;
          }).join("")}

        </div>
      </section>
    ` : ""}

  </main>

  <script>
    (() => {
      const section = document.querySelector(".related-novels");
      if (!section) return;

      const track = section.querySelector(".related-track");
      const prev = section.querySelector('[data-direction="prev"]');
      const next = section.querySelector('[data-direction="next"]');

      if (!track || !prev || !next) return;

      function updateButtons() {
        const maxScroll = track.scrollWidth - track.clientWidth;
        const current = Math.abs(track.scrollLeft);

        prev.disabled = current < 3;
        next.disabled = current >= maxScroll - 3;
      }

      function move(direction) {
        const card = track.querySelector(".related-card");
        if (!card) return;

        const gap = parseFloat(getComputedStyle(track).gap) || 15;
        const distance = card.getBoundingClientRect().width + gap;

        track.scrollBy({
          left: direction === "next" ? -distance : distance,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth"
        });
      }

      prev.addEventListener("click", () => move("prev"));
      next.addEventListener("click", () => move("next"));

      track.addEventListener("scroll", updateButtons, { passive: true });
      window.addEventListener("resize", updateButtons);

      requestAnimationFrame(updateButtons);
    })();
  </script>
</body>
</html>`;
  }
}

module.exports = NovelPages;
