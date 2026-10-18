
const fs = require("node:fs/promises");
const path = require("node:path");
const { transform } = require("lightningcss");

const root = path.join(process.cwd(), "_site/assets/css");

async function readCSS(relativePath) {
  return fs.readFile(path.join(root, relativePath));
}

async function writeMinified(relativePath, code) {
  const result = transform({
    filename: relativePath,
    code,
    minify: true
  });

  const output = path.join(root, relativePath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, result.code);

  console.log(`CSS optimized: ${relativePath}`);
}

async function main() {
  const base = await readCSS("style.css");

  await writeMinified("style.css", base);

  const themes = ["studio", "signature", "noir"];

  for (const theme of themes) {
    const themePath = `themes/${theme}.css`;

    try {
      const themeCSS = await readCSS(themePath);

      // ترتيب مهم: CSS الأساسي ثم CSS الثيم
      const combined = Buffer.concat([
        base,
        Buffer.from("\n"),
        themeCSS
      ]);

      await writeMinified(`combined-${theme}.css`, combined);

      console.log(`Combined theme ready: ${theme}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(`Theme not found: ${themePath}`);
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
