const fs = require("fs");
const path = require("path");

const root = process.cwd();
const required = [
  "public/banners/janta-freebet.png",
  "public/banners/pilot-ke-aviator.png",
  "public/banners/janta-top-pool.png",
  "public/banners/janta-whatsapp-lottery.png",
  "public/banners/janta-play-win.png",
  "public/news-placeholder.svg",
  "package.json",
  "src/components/janta-advert.tsx",
  "src/components/mobile-zoom-lock.tsx",
  "src/lib/news-api.ts",
  ".env.example",
];

let ok = true;
console.log("soccer.co.ke deploy check\n");

for (const rel of required) {
  const full = path.join(root, rel);
  const exists = fs.existsSync(full);
  console.log(`${exists ? "OK  " : "MISS"}  ${rel}`);
  if (!exists) ok = false;
}

if (!fs.existsSync(path.join(root, ".env.local"))) {
  console.log("\nNOTE: .env.local missing — copy from .env.example before npm start");
}

if (!ok) {
  console.error("\nFAIL: missing files. Re-unzip the full package.");
  process.exit(1);
}

console.log("\nPASS: core files present.");
console.log("Next: npm install && npm run build && npm start");
