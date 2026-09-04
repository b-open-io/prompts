import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const forbidden = [
  /<script[^>]+src=/i,
  /<link[^>]+rel=["']stylesheet/i,
  /https?:\/\/cdn\./i,
  /https?:\/\/unpkg\.com/i,
  /https?:\/\/esm\.sh/i,
];

for (const pattern of forbidden) {
  if (pattern.test(html)) throw new Error(`portable artifact contains ${pattern}`);
}

if (!html.includes("Visual Coordinator")) {
  throw new Error("portable artifact is missing its application shell");
}

console.log(`portable artifact ok (${Buffer.byteLength(html)} bytes)`);
