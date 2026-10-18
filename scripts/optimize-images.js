
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const sourceDir = path.join(
  process.cwd(),
  "assets/images/uploads"
);

const outputDir = path.join(
  process.cwd(),
  "_site/assets/images/optimized"
);

const sizes = [
  { suffix: "", width: 1200 },
  { suffix: "-600", width: 600 },
  { suffix: "-300", width: 300 }
];

async function optimizeImages() {
  await fs.mkdir(outputDir, { recursive: true });

  const files = await fs.readdir(sourceDir, {
    withFileTypes: true
  });

  let count = 0;

  for (const file of files) {
    if (!file.isFile()) continue;

    const extension = path.extname(file.name).toLowerCase();

    if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
      continue;
    }

    const source = path.join(sourceDir, file.name);

    try {
      for (const size of sizes) {
        const target = path.join(
          outputDir,
          `${file.name}${size.suffix}.webp`
        );

        await sharp(source)
          .rotate()
          .resize({
            width: size.width,
            height: size.width,
            fit: "inside",
            withoutEnlargement: true
          })
          .webp({
            quality: 76,
            effort: 4
          })
          .toFile(target);
      }

      count++;

      console.log(`Optimized: ${file.name}`);
    } catch (error) {
      console.error(`Failed: ${file.name}`, error);
      throw error;
    }
  }

  console.log(`Optimized ${count} images in 3 sizes.`);
}

optimizeImages().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
