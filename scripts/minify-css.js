
const fs = require("node:fs/promises");
const path = require("node:path");
const { transform } = require("lightningcss");

const files = [
  "_site/assets/css/style.css",
  "_site/assets/css/themes/studio.css"
];

async function main() {
  for (const file of files) {
    const fullPath = path.resolve(file);

    try {
      const css = await fs.readFile(fullPath);

      const result = transform({
        filename: fullPath,
        code: css,
        minify: true
      });

      await fs.writeFile(fullPath, result.code);

      console.log(`CSS optimized: ${file}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`CSS file not found: ${file}`);
        continue;
      }

      throw error;
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
