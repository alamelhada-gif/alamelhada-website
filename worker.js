
const SITE = "https://alamelhada.com";
const PROJECT = "riwayati-app-26720";

const CINEMA_API = "https://cinema-api.alamelhada.workers.dev";


async function getCinemaSeasons(seriesId) {
  const api = "https://cinema-api.alamelhada.workers.dev";

  const response = await fetch(
    `${api}/seasons?seriesId=${encodeURIComponent(seriesId)}`
  );

  if (!response.ok) {
    throw new Error(`Seasons API: ${response.status}`);
  }

  const seasons = await response.json();

  if (!Array.isArray(seasons)) {
    throw new Error("Invalid seasons response");
  }

  const results = await Promise.all(
    seasons.map(async (season) => {
      const episodesResponse = await fetch(
        `${api}/episodes?seasonId=${encodeURIComponent(season.id)}`
      );

      if (!episodesResponse.ok) {
        throw new Error(`Episodes API: ${episodesResponse.status}`);
      }

      const episodes = await episodesResponse.json();

      if (!Array.isArray(episodes)) {
        throw new Error("Invalid episodes response");
      }

      return { season, episodes };
    })
  );

  return results;
}

function cinemaSlug(value = "") {
  return String(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// إنشاء رابط فريد لكل فيلم أو مسلسل
function cinemaSlugForItem(item, items) {
  const base = cinemaSlug(item.title) || "content";

  const sameTitle = items
    .filter(x => x.kind === item.kind)
    .filter(x => cinemaSlug(x.title) === base)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  if (sameTitle.length <= 1) return base;

  // إضافة جزء من المعرف عند تكرار العنوان
  return `${base}-${String(item.id).slice(0, 8)}`;
}

async function handleCinemaDetail(request, env, url, type, id) {
  
if (
  !id ||
  id.length > 250 ||
  !/^[\p{L}\p{N}_-]+$/u.test(id)
) {
  return new Response("رابط غير صالح", { status: 404 });
}


  try {
    const apiResponse = await fetch(`${CINEMA_API}/content`);

    if (!apiResponse.ok) {
      throw new Error(`Cinema API: ${apiResponse.status}`);
    }

    const items = await apiResponse.json();

    if (!Array.isArray(items)) {
      throw new Error("Invalid cinema data");
    }

  
const expectedKind = type === "movies" ? "movie" : "series";

const item = items.find(x =>
  x.kind === expectedKind &&
  (
    String(x.id) === id ||
    cinemaSlugForItem(x, items) === id
  )
);

if (!item) {
  return new Response("المحتوى غير موجود", { status: 404 });
}

const friendlySlug = cinemaSlugForItem(item, items);
const friendlyPath = `/${type}/${encodeURIComponent(friendlySlug)}/`;

// تحويل الروابط القديمة إلى الروابط الجديدة

if (decodeURIComponent(url.pathname) !==
    decodeURIComponent(friendlyPath)) {

  return Response.redirect(
    `${url.origin}${friendlyPath}`,
    301
  );
}


    const templateUrl = new URL("/cinema-detail/", url.origin);
    const templateResponse = await env.ASSETS.fetch(
      new Request(templateUrl, request)
    );

    if (!templateResponse.ok) return templateResponse;

    let html = await templateResponse.text();

    const canonical = `${SITE}${friendlyPath}`;
    const title = String(item.title || "بدون عنوان");
    const description = String(item.description || "")
      .replace(/\s+/g, " ")
      .slice(0, 160);
    const fullTitle = `${title} | علم الهدى`;
    const poster = String(item.poster || "");

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(fullTitle)}</title>`
    );

    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}">`
    );

    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`
    );

    const metaTags = [
      ["property", "og:type", "website"],
      ["property", "og:title", fullTitle],
      ["property", "og:description", description],
      ["property", "og:url", canonical],
      ["name", "twitter:title", fullTitle],
      ["name", "twitter:description", description]
    ];

    for (const [attr, name, value] of metaTags) {
      const pattern = new RegExp(
        `<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*\\/?>`,
        "i"
      );

      html = html.replace(
        pattern,
        `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
      );
    }

    if (/^https:\/\//.test(poster)) {
      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
        ""
      ).replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        ""
      ).replace(
        "</head>",
        `<meta property="og:image" content="${escapeHtml(poster)}">
         <meta name="twitter:image" content="${escapeHtml(poster)}">
         </head>`
      );
    }

    // تجهيز بيانات الصفحة للعرض دون جلب الفيديو
    const bootstrap = {
      id: item.id,
      kind: item.kind,
      title,
      description: String(item.description || ""),
      poster,
      category: String(item.category || "")
    };

    html = html.replace(
      "</head>",
      `<script>window.__CINEMA_CONTENT__=${safeJson(bootstrap)};</script></head>`
    );

    // جلب المواسم والحلقات للمسلسلات
    let seasonsHtml = "";
    let seasonsSchema = [];

    if (item.kind === "series") {
      const seasonGroups = await getCinemaSeasons(item.id);

      for (const { season, episodes } of seasonGroups) {
        const seasonNumber = Number(season.season_number || 1);
        const seasonTitle =
          season.title || `الموسم ${seasonNumber}`;

        const sortedEpisodes = [...episodes].sort(
          (a, b) =>
            Number(a.episodeNumber || 0) -
            Number(b.episodeNumber || 0)
        );

        seasonsHtml += `
          <section class="cinema-season">
            <h2>${escapeHtml(seasonTitle)}</h2>
            <div class="cinema-episodes">
              ${sortedEpisodes.map(episode => `
                <article class="cinema-episode">
                  <h3>${escapeHtml(
                    episode.title ||
                    `الحلقة ${episode.episodeNumber}`
                  )}</h3>
                  ${episode.description
                    ? `<p>${escapeHtml(episode.description)}</p>`
                    : ""}
                </article>
              `).join("")}
            </div>
          </section>
        `;

        seasonsSchema.push({
          "@type": "TVSeason",
          name: seasonTitle,
          seasonNumber,
          episode: sortedEpisodes.map(episode => ({
            "@type": "TVEpisode",
            name: episode.title ||
              `الحلقة ${episode.episodeNumber}`,
            episodeNumber: Number(episode.episodeNumber || 0),
            description: episode.description || undefined
          }))
        });
      }

      const seriesSchema = {
        "@context": "https://schema.org",
        "@type": "TVSeries",
        name: title,
        description: String(item.description || ""),
        url: canonical,
        containsSeason: seasonsSchema
      };

      if (/^https:\/\//.test(poster)) {
        seriesSchema.image = poster;
      }

      html = html.replace(
        "</head>",
        `<script type="application/ld+json">${safeJson(seriesSchema)}</script></head>`
      );
    }

    // عرض محتوى الفيلم في HTML حتى تتمكن محركات البحث من قراءته
    const detailHtml = `
      <article class="cinema-detail">
        ${/^https:\/\//.test(poster)
          ? `<img class="cinema-detail-poster"
                  src="${escapeHtml(poster)}"
                  alt="${escapeHtml(title)}">`
          : ""}
        <div class="cinema-detail-info">
          <h1>${escapeHtml(title)}</h1>
          <p>${type === "movies" ? "فيلم" : "مسلسل"}</p>
          <p>${escapeHtml(String(item.description || "لا يوجد وصف حاليًا"))}</p>
          <span class="cinema-download">
            تطبيق المشاهدة قريبًا على Google Play
          </span>
          ${seasonsHtml}
        </div>
      </article>`;

    html = html.replace(
      /<div id="cinemaDetail">[\s\S]*?<\/div>/i,
      `<div id="cinemaDetail">${detailHtml}</div>`
    );

    return htmlResponse(html);
  } catch (error) {
    console.error("Cinema detail error:", error);
    return new Response("تعذر تحميل التفاصيل حاليًا", { status: 503 });
  }
}


function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
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

// قراءة مستند واحد من Firebase
async function getDocument(type, id) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
    `/databases/(default)/documents/${type}/${encodeURIComponent(id)}`;

  const response = await fetch(url);

  if (!response.ok) return null;

  return response.json();
}

// البحث عن كتاب أو رواية باستخدام الرابط العربي
async function findBySlug(type, slug) {
  let pageToken = "";
  let pages = 0;

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
      `/databases/(default)/documents/${type}`
    );

    url.searchParams.set("pageSize", "100");
    url.searchParams.append("mask.fieldPaths", "title");
    url.searchParams.append("mask.fieldPaths", "status");

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

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

// جلب جميع روابط الكتب أو الروايات المنشورة
async function getPublishedUrls(type) {
  const urls = new Set();
  let pageToken = "";

  do {
    const apiUrl = new URL(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
      `/databases/(default)/documents/${type}`
    );

    apiUrl.searchParams.set("pageSize", "100");
    apiUrl.searchParams.append("mask.fieldPaths", "title");
    apiUrl.searchParams.append("mask.fieldPaths", "status");

    if (pageToken) {
      apiUrl.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      throw new Error(
        `Firestore ${type}: ${response.status}`
      );
    }

    const data = await response.json();

    for (const document of data.documents || []) {
      const fields = document.fields || {};

      if (fieldValue(fields.status) !== "published") {
        continue;
      }

      const slug = arabicSlug(fieldValue(fields.title));

      if (slug) {
        urls.add(`${SITE}/${type}/${slug}/`);
      }
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return [...urls];
}

// إنشاء خريطة موقع متجددة من Firebase
async function generateSitemap(request, env) {
  const staticResponse = await env.ASSETS.fetch(request);

  if (!staticResponse.ok) {
    return staticResponse;
  }

  try {
    const [books, novels] = await Promise.all([
      getPublishedUrls("books"),
      getPublishedUrls("novels")
    ]);

    const staticXml = await staticResponse.text();

    // الاحتفاظ بروابط الصفحات الثابتة
    const existingUrls = [
      ...staticXml.matchAll(/<loc>([^<]+)<\/loc>/g)
    ].map(match => match[1]);

    const allUrls = new Set();

    for (const url of existingUrls) {
      if (
        !url.startsWith(`${SITE}/books/`) &&
        !url.startsWith(`${SITE}/novels/`)
      ) {
        allUrls.add(url);
      }
    }

    // إضافة الكتب والروايات الحالية
    for (const url of [...books, ...novels]) {
      allUrls.add(url);
    }

    const entries = [...allUrls].map(url => `
  <url>
    <loc>${escapeHtml(url)}</loc>
  </url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=60"
      }
    });

  } catch (error) {
    console.error("Sitemap generation error:", error);

    // عند تعذر Firebase نستخدم الخريطة الثابتة
    return staticResponse;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // صفحات تفاصيل الأفلام والمسلسلات
    
let cinemaPath;

try {
  cinemaPath = decodeURIComponent(url.pathname);
} catch {
  return new Response("رابط غير صالح", { status: 400 });
}

const cinemaMatch = cinemaPath.match(
  /^\/(movies|series)\/([^/]+)\/?$/
);


    if (cinemaMatch) {
      return handleCinemaDetail(
        request,
        env,
        url,
        cinemaMatch[1],
        cinemaMatch[2]
      );
    }


    // خريطة الموقع الديناميكية
    if (url.pathname === "/sitemap.xml") {
      return generateSitemap(request, env);
    }

    let path;

    try {
      path = decodeURI(url.pathname);
    } catch {
      return env.ASSETS.fetch(request);
    }

    let type = "";
    let id = "";
    let slug = "";

    const match = path.match(
      /^\/(books|novels)\/([^/]+)\/?$/
    );

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

      } else if (
        id &&
        /^[a-zA-Z0-9_-]+$/.test(id)
      ) {
        document = await getDocument(type, id);
      }

      if (!document) {
        return env.ASSETS.fetch(request);
      }

      const fields = document.fields || {};

      if (fieldValue(fields.status) !== "published") {
        return new Response("المحتوى غير متاح", {
          status: 404
        });
      }

      const docId = document.name.split("/").pop();

      const title = String(
        fieldValue(fields.title) || "كتاب"
      );

      const author = String(
        fieldValue(fields.author) || ""
      );

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

      // استخدام صفحة التفاصيل المبنية بواسطة Eleventy
      const pageUrl = new URL(
        "/library-detail/",
        url.origin
      );

      const pageResponse = await env.ASSETS.fetch(
        new Request(pageUrl, request)
      );

      if (!pageResponse.ok) {
        return pageResponse;
      }

      let html = await pageResponse.text();

      const fullTitle =
        `${title}${author ? ` - ${author}` : ""} | علم الهدى`;

      // عنوان الصفحة
      html = replaceTag(
        html,
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(fullTitle)}</title>`
      );

      // وصف الصفحة
      html = replaceTag(
        html,
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(description)}">`
      );

      // الرابط الأساسي
      html = replaceTag(
        html,
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtml(canonical)}">`
      );

      // بيانات المشاركة في الشبكات الاجتماعية
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

      // صورة الغلاف للمشاركة
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

      // بيانات الكتاب المنظمة
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
        schema.author = {
          "@type": "Person",
          name: author
        };
      }

      if (cover.startsWith("https://")) {
        schema.image = cover;
      }

      html = html.replace(
        "</head>",
        `<script type="application/ld+json">${safeJson(schema)}</script>
         </head>`
      );

      // تمرير معرف الكتاب أو الرواية إلى JavaScript
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
      console.error(
        "Library SEO Worker:",
        error
      );

      return env.ASSETS.fetch(request);
    }
  }
};
