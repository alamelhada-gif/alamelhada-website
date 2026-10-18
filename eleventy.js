
module.exports = function (eleventyConfig) {

  // ملفات الموقع الأساسية
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("ads.txt");
  eleventyConfig.addPassthroughCopy("app-ads.txt");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("robots.txt");

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
