
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

  ${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">
  <meta property="og:image:alt" content="غلاف ${escapeHtml(title)}">` : ""}

  <meta name="twitter:card"
        content="${cover ? "summary_large_image" : "summary"}">

  <meta name="twitter:title"
        content="${escapeHtml(pageTitle)}">

  <meta name="twitter:description"
        content="${escapeHtml(seoDescription)}">

  ${cover ? `<meta name="twitter:image" content="${escapeHtml(cover)}">` : ""}

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <main style="max-width:850px;margin:40px auto;padding:24px;text-align:center">
    <a href="/books/">العودة إلى الكتب</a>

    <article>
      <h1>${escapeHtml(title)}</h1>

      ${cover ? `<img src="${escapeHtml(cover)}"
        alt="غلاف ${escapeHtml(title)}"
        loading="eager"
        decoding="async"
        style="max-width:100%;max-height:440px;object-fit:contain;border-radius:16px">` : ""}

      ${author ? `<p>المؤلف: ${escapeHtml(author)}</p>` : ""}

      ${category ? `<p>التصنيف: ${escapeHtml(category)}</p>` : ""}

      <p style="line-height:2">
        ${escapeHtml(description)}
      </p>

      ${readerUrl ? `<a href="${escapeHtml(readerUrl)}"
        style="display:inline-block;padding:14px 28px;background:#4F9A43;color:white;border-radius:12px;text-decoration:none">قراءة الكتاب</a>` : ""}
    </article>
  </main>
</body>
</html>`;
  }
}

module.exports = BookPages;
