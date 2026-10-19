
const SITE = "https://alamelhada.com";
const PROJECT = "riwayati-app-26720";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function fieldValue(field) {
  return field?.stringValue ??
    field?.integerValue ??
    field?.booleanValue ?? "";
}

function arabicSlug(value = "") {
  return String(value)
    .normalize("NFKC")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function replaceTag(html, pattern, replacement) {
  return html.replace(pattern, replacement);
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60"
    }
  });
}

async function getDocument(type, id) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
    `/databases/(default)/documents/${type}/${encodeURIComponent(id)}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  return response.json();
}

async function findBySlug(type, slug) {
  let pageToken = "";
  let pages = 0;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
      `/databases/(default)/documents/${type}`
    );

    url.searchParams.set("pageSize", "100");
    url.searchParams.set("mask.fieldPaths", "title");
    url.searchParams.append("mask.fieldPaths", "status");

    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();

    for (const doc of data.documents || []) {
      const fields = doc.fields || {};

      if (
        fieldValue(fields.status) === "published" &&
        arabicSlug(fieldValue(fields.title)) === slug
      ) {
        const id = doc.name.split("/").pop();
        return getDocument(type, id);
      }
    }

    pageToken = data.nextPageToken || "";
    pages++;
  } while (pageToken && pages < 20);

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = decodeURI(url.pathname);

    let type = "";
    let id = "";
    let slug = "";

    const match = path.match(/^\/(books|novels)\/([^/]+)\/?$/);

    if (match) {
      type = match[1];
      slug = match[2];
    } else if (
      path === "/library-detail/" ||
      path === "/library-detail/index.html"
    ) {
      type = url.searchParams.get("type") || "";
      id = url.searchParams.get("id") || "";
    } else {
      return env.ASSETS.fetch(request);
    }

    if (!["books", "novels"].includes(type)) {
      return env.ASSETS.fetch(request);
    }

    let document;

    try {
      if (slug) {
        document = await findBySlug(type, slug);
      } else if (id && /^[a-zA-Z0-9_-]+$/.test(id)) {
        document = await getDocument(type, id);
      }

      if (!document) {
        return env.ASSETS.fetch(request);
      }

      const fields = document.fields || {};

      if (fieldValue(fields.status) !== "published") {
        return new Response("المحتوى غير متاح", { status: 404 });
      }

      const docId = document.name.split("/").pop();
      const title = String(fieldValue(fields.title) || "كتاب");
      const author = String(fieldValue(fields.author) || "");
      const description = String(
        fieldValue(fields.description) ||
        `اقرأ ${title} في مكتبة علم الهدى`
      ).replace(/\s+/g, " ").slice(0, 160);

      const cover = String(
        fieldValue(fields.coverUrl) ||
        fieldValue(fields.cover) || ""
      );

      const canonical =
        `${SITE}/${type}/${arabicSlug(title)}/`;

      // نستخدم صفحة التفاصيل الموجودة حاليًا
      const pageUrl = new URL("/library-detail/", url.origin);
      const pageResponse = await env.ASSETS.fetch(
        new Request(pageUrl, request)
      );

      if (!pageResponse.ok) return pageResponse;

      let html = await pageResponse.text();

      const fullTitle =
        `${title}${author ? ` - ${author}` : ""} | علم الهدى`;

      html = replaceTag(
        html,
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(fullTitle)}</title>`
      );

      html = replaceTag(
        html,
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(description)}">`
      );

      html = replaceTag(
        html,
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtml(canonical)}">`
      );

      const tags = [
        ["property", "og:type", "book"],
        ["property", "og:title", fullTitle],
        ["property", "og:description", description],
        ["property", "og:url", canonical],
        ["name", "twitter:title", fullTitle],
        ["name", "twitter:description", description]
      ];

      for (const [attr, name, value] of tags) {
        const pattern = new RegExp(
          `<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*\\/?>`,
          "i"
        );

        html = html.replace(
          pattern,
          `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
        );
      }

      if (/^https:\/\//.test(cover)) {
        html = html.replace(
          /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
          ""
        ).replace(
          /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
          ""
        ).replace(
          "</head>",
          `<meta property="og:image" content="${escapeHtml(cover)}">
           <meta name="twitter:image" content="${escapeHtml(cover)}">
           </head>`
        );
      }

      const schema = {
        "@context": "https://schema.org",
        "@type": "Book",
        name: title,
        url: canonical,
        description,
        inLanguage: "ar",
        mainEntityOfPage: canonical
      };

      if (author) {
        schema.author = { "@type": "Person", name: author };
      }

      if (cover.startsWith("https://")) {
        schema.image = cover;
      }

      html = html.replace(
        "</head>",
        `<script type="application/ld+json">${safeJson(schema)}</script>
         </head>`
      );

      // تمرير بيانات الكتاب إلى صفحة التفاصيل الحالية
      const bootstrap = {
        type,
        id: docId,
        title
      };

      html = html.replace(
        "</head>",
        `<script>
          window.__LIBRARY_CONTENT__ = ${safeJson(bootstrap)};
         </script></head>`
      );

      return htmlResponse(html);

    } catch (error) {
      console.error("Library SEO Worker:", error);
      return env.ASSETS.fetch(request);
    }
  }
};
