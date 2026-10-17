
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
    const url = new URL(String(value || ""), SITE);
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
  const id = encodeURIComponent(book.id);

  return `/books/${encodeURIComponent(slug)}-${id}/`;
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
    const title = book.title || "كتاب";
    const author = book.author || "";
    const description = book.description || "";
    const cover = safeUrl(book.cover);
    const pdf = safeUrl(book.pdfUrl);

    const pageUrl = `${SITE}${bookPath(book)}`;

    const readerUrl = pdf
      ? `/reader/?url=${encodeURIComponent(pdf)}&title=${encodeURIComponent(title)}`
      : "";

    const schema = {
      "@context": "https://schema.org",
      "@type": "Book",
      name: title,
      url: pageUrl,
      inLanguage: "ar"
    };

    if (description) schema.description = description;

    if (author) {
      schema.author = {
        "@type": "Person",
        name: author
      };
    }

    if (cover) schema.image = cover;

    const jsonLd = JSON.stringify(schema)
      .replace(/</g, "\\u003c");

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width,initial-scale=1">

  <title>${escapeHtml(title)} | علم الهدى</title>

  <meta name="description"
        content="${escapeHtml(description || `اقرأ كتاب ${title} في مكتبة علم الهدى`)}">

  <link rel="canonical"
        href="${escapeHtml(pageUrl)}">

  <meta property="og:type" content="book">
  <meta property="og:title"
        content="${escapeHtml(title)}">
  <meta property="og:url"
        content="${escapeHtml(pageUrl)}">

  ${cover ? `<meta property="og:image" content="${escapeHtml(cover)}">` : ""}

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/css/style.css">
</head>
<body>
  <main style="max-width:850px;margin:40px auto;padding:24px;text-align:center">
    <a href="/books/">العودة إلى الكتب</a>

    <article>
      <h1>${escapeHtml(title)}</h1>

      ${cover ? `<img src="${escapeHtml(cover)}" alt="غلاف ${escapeHtml(title)}" style="max-width:100%;max-height:440px;object-fit:contain;border-radius:16px">` : ""}

      ${author ? `<p>المؤلف: ${escapeHtml(author)}</p>` : ""}

      ${book.category ? `<p>التصنيف: ${escapeHtml(book.category)}</p>` : ""}

      <p style="line-height:2">
        ${escapeHtml(description)}
      </p>

      ${readerUrl ? `<a href="${escapeHtml(readerUrl)}" style="display:inline-block;padding:14px 28px;background:#4F9A43;color:white;border-radius:12px;text-decoration:none">قراءة الكتاب</a>` : ""}
    </article>
  </main>
</body>
</html>`;
  }
}

module.exports = BookPages;
