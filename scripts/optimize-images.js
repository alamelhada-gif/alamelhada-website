
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

    const target = path.join(
      outputDir,
      `${file.name}.webp`
    );

    try {
      await sharp(source)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true
        })
        .webp({ quality: 78, effort: 4 })
        .toFile(target);

      count++;
      console.log(`Optimized: ${file.name}`);
    } catch (error) {
      console.error(`Failed: ${file.name}`, error);
    }
  }

  console.log(`Optimized ${count} images.`);
}

optimizeImages().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
