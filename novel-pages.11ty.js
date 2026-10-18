
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

function novelPath(novel) {
  const slug = arabicSlug(novel.title || "رواية");
  return `/novels/${slug}/`;
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
    const title = novel.title || "رواية";
    const author = novel.author || "";
    const description = novel.description || "";
    const cover = safeUrl(novel.coverUrl || novel.cover);
    const pdf = safeUrl(novel.pdfUrl);

    const pageUrl = `${SITE}${novelPath(novel)}`;

    const readerUrl = pdf
      ? `/reader/?url=${encodeURIComponent(pdf)}&title=${encodeURIComponent(title)}`
      : "";

    const schema = {
      "@context": "https://schema.org",
      "@type": "Book",
      name: title,
      url: pageUrl,
      inLanguage: "ar",
      genre: "رواية"
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
        content="${escapeHtml(description || `اقرأ رواية ${title} في مكتبة علم الهدى`)}">

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
    <a href="/novels/">العودة إلى الروايات</a>

    <article>
      <h1>${escapeHtml(title)}</h1>

      ${cover ? `<img src="${escapeHtml(cover)}" alt="غلاف ${escapeHtml(title)}" style="max-width:100%;max-height:440px;object-fit:contain;border-radius:16px">` : ""}

      ${author ? `<p>المؤلف: ${escapeHtml(author)}</p>` : ""}

      ${novel.category ? `<p>التصنيف: ${escapeHtml(novel.category)}</p>` : ""}

      <p style="line-height:2">
        ${escapeHtml(description)}
      </p>

      ${readerUrl ? `<a href="${escapeHtml(readerUrl)}" style="display:inline-block;padding:14px 28px;background:#4F9A43;color:white;border-radius:12px;text-decoration:none">قراءة الرواية</a>` : ""}
    </article>
  </main>
</body>
</html>`;
  }
}

module.exports = NovelPages;
