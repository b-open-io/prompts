#!/usr/bin/env bun
/**
 * HTML → PDF business card renderer.
 *
 * Default: renders BOTH fonts (inter + geist) × {front, back} → 4 PDFs in out/
 * Single: bun render.ts <font>  where font ∈ inter|geist
 */
import { chromium, type Browser } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { renderArtisticQR } from "./qr-artistic.ts";

/**
 * QR center logo — black disc with the official Bootstrap Icons
 * `currency-bitcoin` glyph in white. Straight ₿ symbol, not the tilted
 * orange Bitcoin Core coin logo. Read from node_modules at render time so
 * any upstream icon revision flows through on the next bun install.
 */
const BITCOIN_ICON = readFileSync(
  resolve("node_modules/bootstrap-icons/icons/currency-bitcoin.svg"),
  "utf8",
);
const BITCOIN_PATH = BITCOIN_ICON.match(/<path d="([^"]+)"/)?.[1] ?? "";

const BOPEN_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#0a0a0a"/>
  <g transform="translate(18 18) scale(4.25)" fill="#ffffff">
    <path d="${BITCOIN_PATH}"/>
  </g>
</svg>`;

type Employee = {
  name: string; title: string; email: string;
  handle?: string; phone?: string;
  qrUrl: string; qrLabel?: string;
};

const FONTS = ["inter", "geist"] as const;
type Font = typeof FONTS[number];

const fontArg = process.argv[2] as Font | undefined;
const fonts: readonly Font[] = fontArg && FONTS.includes(fontArg) ? [fontArg] : FONTS;

const employeePath = resolve("employees/satchmo.json");
const outDir = resolve("out");
mkdirSync(outDir, { recursive: true });

if (!existsSync(employeePath)) {
  console.error(`[render] employee file not found: ${employeePath}`);
  process.exit(1);
}

const employee: Employee = JSON.parse(readFileSync(employeePath, "utf8"));
const slug = basename(employeePath, ".json");
const frontTemplate = readFileSync(resolve("card.html"), "utf8");
const backTemplate = readFileSync(resolve("card-back.html"), "utf8");
const baseUrl = pathToFileURL(resolve("./") + "/").toString();

const qrSvg = await renderArtisticQR({
  url: employee.qrUrl,
  size: 1000,
  fg: "#000000",
  dotShape: "circle",
  logoSvg: BOPEN_MARK_SVG,
  logoScale: 0.20,
});

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fillFront(html: string, font: Font): string {
  return html
    .replace("__FONT__", font)
    .replace("__NAME__", escape(employee.name))
    .replace("__TITLE__", escape(employee.title))
    .replace("__EMAIL__", escape(employee.email))
    .replace("__HANDLE__", escape(employee.handle ?? ""))
    .replace("__PHONE__", escape(employee.phone ?? ""));
}

function fillBack(html: string, font: Font): string {
  return html
    .replace("__FONT__", font)
    .replace("__QR_SVG__", qrSvg)
    .replace("__QR_LABEL__", escape(employee.qrLabel ?? employee.qrUrl));
}

const browser: Browser = await chromium.launch();
const page = await browser.newPage();

async function renderSide(html: string, outPath: string): Promise<void> {
  await page.goto(baseUrl);
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: outPath,
    width: "3.75in",
    height: "2.25in",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });
}

for (const font of fonts) {
  const frontOut = `${outDir}/${slug}-${font}-front.pdf`;
  const backOut = `${outDir}/${slug}-${font}-back.pdf`;
  await renderSide(fillFront(frontTemplate, font), frontOut);
  await renderSide(fillBack(backTemplate, font), backOut);
  console.log(`[render] ${font}: ${frontOut} + ${backOut}`);
}

await browser.close();
