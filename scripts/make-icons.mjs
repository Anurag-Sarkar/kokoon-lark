/* Renders the app icon (the sidebar's black rounded square with a white mark) to the PNG sizes a PWA needs.
   Run: node scripts/make-icons.mjs  — writes public/icons/*.png, src/app/icon.png and src/app/apple-icon.png. */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const INK = "#0b0b0b";

/** `rounded` = standard icon with rounded corners and padding; otherwise a full-bleed "maskable" icon. */
function svg(size, rounded) {
  const r = rounded ? size * 0.22 : 0;
  const mark = rounded ? size * 0.42 : size * 0.36; // maskable keeps the mark inside the safe zone
  const x = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${INK}"/>
  <rect x="${x}" y="${x}" width="${mark}" height="${mark}" rx="${mark * 0.23}" fill="#ffffff"/>
</svg>`;
}

const jobs = [
  ["public/icons/icon-192.png", 192, true],
  ["public/icons/icon-512.png", 512, true],
  ["public/icons/maskable-512.png", 512, false],
  ["src/app/icon.png", 64, true],
  ["src/app/apple-icon.png", 180, false],
];
await mkdir("public/icons", { recursive: true });
for (const [file, size, rounded] of jobs) {
  await sharp(Buffer.from(svg(size, rounded))).png().toFile(file);
  console.log(`wrote ${file} (${size}px)`);
}
