
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

function renderCinemaSeasonCards(seasons, seriesPath, currentSeasonId = "") {
  return seasons.map(({ season }) => {
    const seasonNumber = Number(season.season_number || 1);
    const seasonTitle = String(
      season.title || `الموسم ${seasonNumber}`
    );

    const seasonPoster = String(season.poster || "").trim();

    const seasonUrl =
      `${seriesPath}season-${seasonNumber}/`;

    const isCurrent = String(season.id) === String(currentSeasonId);

    return `
      <a class="cinema-season-card${isCurrent ? " is-current" : ""}"
         href="${escapeHtml(seasonUrl)}">

        ${/^https:\/\//i.test(seasonPoster)
          ? `<img
               src="${escapeHtml(seasonPoster)}"
               alt="${escapeHtml(seasonTitle)}"
               loading="lazy">`
          : ""}

        <h3>${escapeHtml(seasonTitle)}</h3>
      </a>
    `;
  }).join("");
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
    let seasonGroups = [];

    if (item.kind === "series") {
  seasonGroups = await getCinemaSeasons(item.id);

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
    
      // عرض بطاقات المواسم بدل قائمة الحلقات
      seasonsHtml = seasonGroups.length
        ? `
          <section class="cinema-seasons-list">
            <h2>مواسم المسلسل</h2>
            <div class="cinema-seasons-grid">
              ${renderCinemaSeasonCards(
                seasonGroups,
                friendlyPath
              )}
            </div>
          </section>
        `
        : "";

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
          
<a
  class="cinema-download"
  href="https://apkpure.com/%D9%85%D8%B4%D8%A7%D9%87%D8%AF%D8%A9-%D8%A7%D9%81%D9%84%D8%A7%D9%85-%D9%88-%D9%85%D8%B3%D9%84%D8%B3%D9%84%D8%A7%D8%AA/alam.movie/download#google_vignette"
  target="_blank"
  rel="noopener noreferrer"
>
  للمشاهدة نزّل التطبيق من هنا
</a>

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


async function handleCinemaSeasonDetail(
  request, env, url, seriesSlug, seasonNumber
) {
  try {
    const response = await fetch(`${CINEMA_API}/content`);

    if (!response.ok) throw new Error("Cinema API error");

    const items = await response.json();

    if (!Array.isArray(items)) {
      throw new Error("Invalid cinema content");
    }

    const series = items.find(item =>
      item.kind === "series" &&
      (
        String(item.id) === seriesSlug ||
        cinemaSlugForItem(item, items) === seriesSlug
      )
    );

    if (!series) {
      return new Response("المسلسل غير موجود", { status: 404 });
    }

    const groups = await getCinemaSeasons(series.id);

    const current = groups.find(
      ({ season }) =>
        Number(season.season_number) === seasonNumber
    );

    if (!current) {
      return new Response("الموسم غير موجود", { status: 404 });
    }

    const { season, episodes } = current;

    const seriesPath =
      `/series/${encodeURIComponent(cinemaSlugForItem(series, items))}/`;

    const seasonPath = `${seriesPath}season-${seasonNumber}/`;
    const canonical = `${SITE}${seasonPath}`;

    const seasonTitle =
      season.title || `الموسم ${seasonNumber}`;

    const fullTitle =
      `${series.title} - ${seasonTitle} | علم الهدى`;

    const description =
      String(season.description || "").trim();

    const poster =
      String(season.poster || "").trim();

    const templateUrl = new URL("/cinema-detail/", url.origin);

    const templateResponse = await env.ASSETS.fetch(
      new Request(templateUrl, request)
    );

    if (!templateResponse.ok) return templateResponse;

    let html = await templateResponse.text();

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(fullTitle)}</title>`
    );

    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(
        description || `${seasonTitle} من ${series.title}`
      )}">`
    );

    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`
    );

    const sortedEpisodes = [...episodes].sort(
      (a, b) =>
        Number(a.episodeNumber || 0) -
        Number(b.episodeNumber || 0)
    );

  
  const episodesHtml = sortedEpisodes.length
  ? sortedEpisodes.map(episode => {
      const episodeNumber = Number(episode.episodeNumber || 0);
      const episodeUrl = `${seasonPath}episode-${episodeNumber}/`;
      const episodeTitle = episode.title || `الحلقة ${episodeNumber}`;

      return `
        <a class="cinema-episode"
           href="${escapeHtml(episodeUrl)}"
           style="display:block;text-decoration:none;color:inherit;cursor:pointer;">
          <h3>${escapeHtml(episodeTitle)} ←</h3>
          ${episode.description
            ? `<p>${escapeHtml(episode.description)}</p>`
            : ""}
        </a>
      `;
    }).join("")
  : "<p>لا توجد حلقات منشورة حاليًا.</p>";


    const otherSeasons = groups.filter(
      ({ season: other }) =>
        String(other.id) !== String(season.id)
    );

    const detailHtml = `
      <article class="cinema-detail cinema-season-detail">
        <div class="cinema-detail-info">
          <a href="${escapeHtml(seriesPath)}">
            ← العودة إلى المسلسل
          </a>

          <h1>${escapeHtml(series.title)} - ${escapeHtml(seasonTitle)}</h1>

          ${/^https:\/\//i.test(poster)
            ? `<img class="cinema-detail-poster"
                     src="${escapeHtml(poster)}"
                     alt="${escapeHtml(seasonTitle)}">`
            : ""}

          
${description ? `
  <div class="episode-description">
    <p class="episode-description-text" id="episodeDescription">
      ${escapeHtml(description)}
    </p>
    <button
      type="button"
      class="episode-read-more"
      id="episodeReadMore"
      aria-expanded="false"
      aria-controls="episodeDescription"
      onclick="
        const p = document.getElementById('episodeDescription');
        const expanded = p.classList.toggle('expanded');
        this.textContent = expanded ? 'عرض أقل' : '...المزيد';
        this.setAttribute('aria-expanded', String(expanded));
      "
    >...المزيد</button>
  </div>
` : ""}


          <h2>حلقات ${escapeHtml(seasonTitle)}</h2>

          <div class="cinema-episodes">
            ${episodesHtml}
          </div>

          ${otherSeasons.length
            ? `
              <section class="cinema-seasons-list">
                <h2>باقي مواسم المسلسل</h2>
                <div class="cinema-seasons-grid">
                  ${renderCinemaSeasonCards(
                    otherSeasons,
                    seriesPath
                  )}
                </div>
              </section>
            `
            : ""}
        </div>
      </article>
    `;

    html = html.replace(
      /<div id="cinemaDetail">[\s\S]*?<\/div>/i,
      `<div id="cinemaDetail">${detailHtml}</div>`
    );

    const schema = {
      "@context": "https://schema.org",
      "@type": "TVSeason",
      name: `${series.title} - ${seasonTitle}`,
      seasonNumber,
      description: description || undefined,
      url: canonical,
      partOfSeries: {
        "@type": "TVSeries",
        name: series.title,
        url: `${SITE}${seriesPath}`
      },
      episode: sortedEpisodes.map(episode => ({
        "@type": "TVEpisode",
        name: episode.title ||
          `الحلقة ${episode.episodeNumber}`,
        episodeNumber: Number(episode.episodeNumber || 0),
        description: episode.description || undefined
      }))
    };

    if (/^https:\/\//i.test(poster)) {
      schema.image = poster;
    }

    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${safeJson(schema)}</script></head>`
    );

    return htmlResponse(html);

  } catch (error) {
    console.error("Cinema season detail error:", error);

    return new Response(
      "تعذر تحميل تفاصيل الموسم حاليًا",
      { status: 503 }
    );
  }
}

async function handleCinemaEpisodeDetail(
  request, env, url, seriesSlug, seasonNumber, episodeNumber
) {
  try {
    const response = await fetch(`${CINEMA_API}/content`);
    if (!response.ok) throw new Error("Cinema API error");

    const items = await response.json();
    if (!Array.isArray(items)) throw new Error("Invalid content");

    const series = items.find(item =>
      item.kind === "series" &&
      cinemaSlugForItem(item, items) === seriesSlug
    );

    if (!series) {
      return new Response("المسلسل غير موجود", { status: 404 });
    }

    const groups = await getCinemaSeasons(series.id);
    const current = groups.find(({ season }) =>
      Number(season.season_number) === seasonNumber
    );

    if (!current) {
      return new Response("الموسم غير موجود", { status: 404 });
    }

    const { season, episodes } = current;

    const episode = episodes.find(item =>
      Number(item.episodeNumber) === episodeNumber
    );

    if (!episode) {
      return new Response("الحلقة غير موجودة", { status: 404 });
    }

    const seriesPath =
      `/series/${encodeURIComponent(cinemaSlugForItem(series, items))}/`;
    const seasonPath = `${seriesPath}season-${seasonNumber}/`;
    const episodePath = `${seasonPath}episode-${episodeNumber}/`;
    const canonical = `${SITE}${episodePath}`;

    const seasonTitle = String(
      season.title || `الموسم ${seasonNumber}`
    );
    const episodeTitle = String(
      episode.title || `الحلقة ${episodeNumber}`
    );
    const poster = String(season.poster || "").trim();
    const description = String(
      episode.description || season.description || ""
    ).trim();

    const fullTitle =
      `${series.title} - ${seasonTitle} - ${episodeTitle} | علم الهدى`;

    const metaDescription = (
      description ||
      `تعرف على تفاصيل ${episodeTitle} من ${seasonTitle} لمسلسل ${series.title} وحمّل تطبيق مشاهدة الأفلام للمشاهدة.`
    ).replace(/\s+/g, " ").slice(0, 160);

    const templateUrl = new URL("/cinema-detail/", url.origin);
    const templateResponse = await env.ASSETS.fetch(
      new Request(templateUrl, request)
    );

    if (!templateResponse.ok) return templateResponse;

    let html = await templateResponse.text();

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(fullTitle)}</title>`
    );

    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(metaDescription)}">`
    );

    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`
    );

    const socialTags = [
      ["property", "og:type", "article"],
      ["property", "og:title", fullTitle],
      ["property", "og:description", metaDescription],
      ["property", "og:url", canonical],
      ["name", "twitter:title", fullTitle],
      ["name", "twitter:description", metaDescription]
    ];

    for (const [attr, name, value] of socialTags) {
      const pattern = new RegExp(
        `<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*\\/?>`,
        "i"
      );
      html = html.replace(
        pattern,
        `<meta ${attr}="${name}" content="${escapeHtml(value)}">`
      );
    }

    if (/^https:\/\//i.test(poster)) {
      html = html.replace(
        "</head>",
        `<meta property="og:image" content="${escapeHtml(poster)}">
         <meta name="twitter:image" content="${escapeHtml(poster)}">
         </head>`
      );
    }

    const sortedEpisodes = [...episodes].sort(
      (a, b) => Number(a.episodeNumber || 0) -
        Number(b.episodeNumber || 0)
    );

    const otherEpisodesHtml = sortedEpisodes
      .filter(item => Number(item.episodeNumber) !== episodeNumber)
      .map(item => {
        const number = Number(item.episodeNumber || 0);
        const title = item.title || `الحلقة ${number}`;
        return `
          <a class="cinema-episode"
             href="${escapeHtml(`${seasonPath}episode-${number}/`)}"
             style="display:block;text-decoration:none;color:inherit">
            <h3>${escapeHtml(title)} ←</h3>
          </a>`;
      }).join("");

    const detailHtml = `
      <article class="cinema-detail cinema-season-detail">
        <div class="cinema-detail-info">
          <nav aria-label="مسار الصفحة">
            <a href="${escapeHtml(seriesPath)}">${escapeHtml(series.title)}</a>
            /
            <a href="${escapeHtml(seasonPath)}">${escapeHtml(seasonTitle)}</a>
            /
            <span>${escapeHtml(episodeTitle)}</span>
          </nav>

          <h1>${escapeHtml(series.title)} - ${escapeHtml(seasonTitle)} - ${escapeHtml(episodeTitle)}</h1>

          ${/^https:\/\//i.test(poster)
            ? `<img class="cinema-detail-poster"
                     src="${escapeHtml(poster)}"
                     alt="${escapeHtml(`${series.title} - ${seasonTitle}`)}">`
            : ""}

          <h2>تفاصيل الحلقة</h2>
         
<p>
  <strong>المسلسل:</strong>
  <a href="${escapeHtml(seriesPath)}"
     style="color:#2563eb;font-weight:700;text-decoration:none;">
    ${escapeHtml(series.title)}
  </a>
</p>

          <p><strong>الموسم:</strong> ${escapeHtml(seasonTitle)}</p>
          <p><strong>الحلقة:</strong> ${escapeHtml(episodeTitle)}</p>

          
${description ? `
  <div class="episode-description">
    <p class="episode-description-text" id="episodeDescription">
      ${escapeHtml(description)}
    </p>
    <button
      type="button"
      class="episode-read-more"
      aria-expanded="false"
      aria-controls="episodeDescription"
      onclick="
        const p = document.getElementById('episodeDescription');
        const expanded = p.classList.toggle('expanded');
        this.textContent = expanded ? 'عرض أقل' : '...المزيد';
        this.setAttribute('aria-expanded', String(expanded));
      "
    >...المزيد</button>
  </div>
` : ""}


          <a class="cinema-download"
             href="https://apkpure.com/p/alam.movie"
             target="_blank"
             rel="noopener noreferrer">
            للمشاهدة نزّل التطبيق من هنا
          </a>

          ${otherEpisodesHtml
            ? `<section class="cinema-seasons-list">
                 <h2>باقي حلقات الموسم</h2>
                 <div class="cinema-episodes">${otherEpisodesHtml}</div>
               </section>`
            : ""}
        </div>
      </article>
    `;

    html = html.replace(
      /<div id="cinemaDetail">[\s\S]*?<\/div>/i,
      `<div id="cinemaDetail">${detailHtml}</div>`
    );

    const schema = {
      "@context": "https://schema.org",
      "@type": "TVEpisode",
      name: episodeTitle,
      episodeNumber,
      description: metaDescription,
      url: canonical,
      partOfSeason: {
        "@type": "TVSeason",
        name: seasonTitle,
        seasonNumber,
        url: `${SITE}${seasonPath}`,
        partOfSeries: {
          "@type": "TVSeries",
          name: series.title,
          url: `${SITE}${seriesPath}`
        }
      }
    };

    if (/^https:\/\//i.test(poster)) {
      schema.image = poster;
    }

    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${safeJson(schema)}</script></head>`
    );

    return htmlResponse(html);

  } catch (error) {
    console.error("Cinema episode detail error:", error);
    return new Response(
      "تعذر تحميل تفاصيل الحلقة حاليًا",
      { status: 503 }
    );
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


async function getCinemaSitemapUrls() {
  const response = await fetch(`${CINEMA_API}/content`);

  if (!response.ok) {
    throw new Error(`Cinema API: ${response.status}`);
  }

  const items = await response.json();

  if (!Array.isArray(items)) {
    throw new Error("Invalid cinema content");
  }

  const urls = new Set();

  const validItems = items.filter(item =>
    item &&
    item.id &&
    (item.kind === "movie" || item.kind === "series")
  );

  for (const item of validItems) {
    const type = item.kind === "movie"
      ? "movies"
      : "series";

    const slug = cinemaSlugForItem(item, items);

    const itemUrl =
      `${SITE}/${type}/${encodeURIComponent(slug)}/`;

    // إضافة رابط الفيلم أو المسلسل
    urls.add(itemUrl);

    // إضافة صفحات المواسم للمسلسلات فقط
    if (item.kind === "series") {
      try {
        const seasonsResponse = await fetch(
          `${CINEMA_API}/seasons?seriesId=${encodeURIComponent(item.id)}`
        );

        if (!seasonsResponse.ok) {
          throw new Error(
            `Seasons API: ${seasonsResponse.status}`
          );
        }

        const seasons = await seasonsResponse.json();

        if (!Array.isArray(seasons)) {
          throw new Error("Invalid seasons response");
        }

        for (const season of seasons) {
          const seasonNumber = Number(season.season_number);

          if (
            !Number.isSafeInteger(seasonNumber) ||
            seasonNumber < 1
          ) {
            continue;
          }

          // رابط مستقل لكل موسم
          urls.add(
            `${itemUrl}season-${seasonNumber}/`
          );
        }

      } catch (error) {
        console.error(
          `Sitemap seasons error for ${item.id}:`,
          error
        );
      }
    }
  }

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
 
let cinemaUrls = [];

try {
  cinemaUrls = await getCinemaSitemapUrls();
} catch (error) {
  console.error("Cinema sitemap error:", error);
}

    const staticXml = await staticResponse.text();

    // الاحتفاظ بروابط الصفحات الثابتة
    const existingUrls = [
      ...staticXml.matchAll(/<loc>([^<]+)<\/loc>/g)
    ].map(match => match[1]);

    const allUrls = new Set();

    for (const url of existingUrls) {
      if (
        
   !url.startsWith(`${SITE}/books/`) &&
   !url.startsWith(`${SITE}/novels/`) &&
   !url.startsWith(`${SITE}/movies/`) &&
   !url.startsWith(`${SITE}/series/`)

      ) {
        allUrls.add(url);
      }
    }

    // إضافة الكتب والروايات الحالية
     
  for (const url of [...books, ...novels, ...cinemaUrls]) {
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

const cinemaEpisodeMatch = cinemaPath.match(
  /^\/series\/([^/]+)\/season-(\d+)\/episode-(\d+)\/?$/
);

if (cinemaEpisodeMatch) {
  return handleCinemaEpisodeDetail(
    request,
    env,
    url,
    cinemaEpisodeMatch[1],
    Number(cinemaEpisodeMatch[2]),
    Number(cinemaEpisodeMatch[3])
  );
}

const cinemaSeasonMatch = cinemaPath.match(
  /^\/series\/([^/]+)\/season-(\d+)\/?$/
);

if (cinemaSeasonMatch) {
  return handleCinemaSeasonDetail(
    request,
    env,
    url,
    cinemaSeasonMatch[1],
    Number(cinemaSeasonMatch[2])
  );
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
