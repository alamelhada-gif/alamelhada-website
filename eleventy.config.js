
module.exports = function (eleventyConfig) {
  
  // استخدام نسخ WebP المحسنة للصور المحلية
  eleventyConfig.addFilter("optimizedImage", function(value = "") {
    const original = String(value || "");

    if (!original.startsWith("/assets/images/uploads/")) {
      return original;
    }

    const filename = original.split("/").pop();

    if (!/\.(png|jpe?g|webp)$/i.test(filename)) {
      return original;
    }

    return `/assets/images/optimized/${filename}.webp`;
  });


  
  // تحويل عناوين الكتب والروايات إلى روابط عربية
  eleventyConfig.addFilter("arabicSlug", function(value = "") {
    return String(value)
      .normalize("NFKC")
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  });


  // ملفات الموقع الأساسية
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("ads.txt");
  eleventyConfig.addPassthroughCopy("app-ads.txt");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("_redirects");

  // إثبات ملكية الموقع في Google Search Console
  eleventyConfig.addPassthroughCopy(
    "google65655d7d7fb1ebde.html"
  );

  // إنشاء خريطة الموقع تلقائيًا
  eleventyConfig.addCollection("sitemapPages", function(collectionApi) {
    return collectionApi.getAll().filter(item => {
      return item.url &&
        item.url !== false &&
        !item.url.startsWith("/admin/") &&
        !item.url.endsWith(".xml");
    });
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
