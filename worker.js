
const SITE = "https://alamelhada.com";
const PROJECT = "riwayati-app-26720";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function firestoreValue(field) {
  if (!field) return "";
  return field.stringValue ?? field.integerValue ??
    field.booleanValue ?? "";
}

function setMeta(html, selector, replacement) {
  return html.replace(selector, replacement);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // بقية الموقع تبقى كما هي تمامًا
    if (url.pathname !== "/library-detail/" &&
        url.pathname !== "/library-detail/index.html") {
      return env.ASSETS.fetch(request);
    }

    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");

    if (!["books", "novels"].includes(type) ||
        !id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return env.ASSETS.fetch(request);
    }

    // قراءة صفحة التفاصيل الحالية من ملفات Eleventy
    const pageRequest = new Request(
      new URL("/library-detail/index.html", url.origin),
      request
    );

    const pageResponse = await env.ASSETS.fetch(pageRequest);

    if (!pageResponse.ok) return pageResponse;

    let html = await pageResponse.text();

    try {
      const apiUrl =
        `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
        `/databases/(default)/documents/${type}/${id}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        return new Response(html, {
          status: pageResponse.status,
          headers: pageResponse.headers
        });
      }

      const document = await response.json();
      const fields = document.fields || {};

      if (firestoreValue(fields.status) !== "published") {
        return new Response(html, {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" }
        });
      }

      const title = String(firestoreValue(fields.title) || "كتاب");
      const description = String(
        firestoreValue(fields.description) ||
        `اقرأ ${title} على موقع علم الهدى`
      ).replace(/\s+/g, " ").slice(0, 160);

      const cover = String(
        firestoreValue(fields.coverUrl) ||
        firestoreValue(fields.cover) || ""
      );

      const canonical =
        `${SITE}/library-detail/?type=${type}&id=${encodeURIComponent(id)}`;

      const fullTitle = `${title} | علم الهدى`;

      html = setMeta(
        html,
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(fullTitle)}</title>`
      );

      html = setMeta(
        html,
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(description)}">`
      );

      html = setMeta(
        html,
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtml(canonical)}">`
      );

      const metaTags = [
        ["og:type", "book"],
        ["og:title", fullTitle],
        ["og:description", description],
        ["og:url", canonical],
        ["twitter:title", fullTitle],
        ["twitter:description", description]
      ];

      for (const [name, value] of metaTags) {
        const attr = name.startsWith("og:") ? "property" : "name";
        const pattern = new RegExp(
          `<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*\\/?>`,
          "i"
        );

        html = html.replace(
          pattern,
          `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
        );
      }

      if (cover && /^https:\/\//.test(cover)) {
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

      // تحديث بيانات WebPage المنظمة القديمة وإضافة Book
      html = html.replace(
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
        (script) => {
          try {
            const jsonText = script
              .replace(/^<script[^>]*>/, "")
              .replace(/<\/script>$/, "");
            const data = JSON.parse(jsonText);

            if (data["@type"] !== "WebPage") return script;

            data["@id"] = canonical + "#webpage";
            data.url = canonical;
            data.name = fullTitle;
            data.description = description;

            return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
          } catch {
            return script;
          }
        }
      );

      const bookSchema = {
        "@context": "https://schema.org",
        "@type": "Book",
        name: title,
        description,
        url: canonical,
        inLanguage: "ar",
        author: {
          "@type": "Person",
          name: String(firestoreValue(fields.author) || "غير معروف")
        }
      };

      if (cover && /^https:\/\//.test(cover)) {
        bookSchema.image = cover;
      }

      html = html.replace(
        "</head>",
        `<script type="application/ld+json">${JSON.stringify(bookSchema).replace(/</g, "\\u003c")}</script>
        </head>`
      );

      const headers = new Headers(pageResponse.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.delete("content-length");
      headers.set("cache-control", "public, max-age=0, s-maxage=60");

      return new Response(html, {
        status: 200,
        headers
      });

    } catch (error) {
      console.error("Dynamic SEO error:", error);

      return new Response(html, {
        status: pageResponse.status,
        headers: pageResponse.headers
      });
    }
  }
};
