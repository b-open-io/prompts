#!/usr/bin/env bun
/**
 * HTML → PDF business card renderer.
 *
 * Default: renders all 5 Geist Pixel variants × {front, back} → 10 PDFs in out/
 * Single: bun render.ts <variant>  where variant ∈ square|grid|circle|triangle|line
 */
import { chromium, type Browser } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { renderArtisticQR } from "./qr-artistic.ts";

// Mini bOpen wordmark to embed in the QR center. Just the lowercase 'b' bowl
// for compactness — the full wordmark is too wide for a square overlay.
const BOPEN_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#0a0a0a"/>
  <text x="50" y="68" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="60" fill="#ffffff">b</text>
</svg>`;

type Employee = {
  name: string; title: string; email: string;
  handle?: string; phone?: string;
  qrUrl: string; qrLabel?: string;
};

const VARIANTS = ["square", "grid", "circle", "triangle", "line"] as const;
type Variant = typeof VARIANTS[number];

const variantArg = process.argv[2] as Variant | undefined;
const variants: readonly Variant[] = variantArg && VARIANTS.includes(variantArg)
  ? [variantArg]
  : VARIANTS;

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

function fillFront(html: string, variant: Variant): string {
  return html
    .replace("__VARIANT__", variant)
    .replace("__VARIANT_LABEL__", `BOPEN.IO · ${variant}`)
    .replace("__NAME__", escape(employee.name))
    .replace("__TITLE__", escape(employee.title))
    .replace("__EMAIL__", escape(employee.email))
    .replace("__HANDLE__", escape(employee.handle ?? ""))
    .replace("__PHONE__", escape(employee.phone ?? ""));
}

function fillBack(html: string): string {
  return html
    .replace("__QR_SVG__", qrSvg)
    .replace("__QR_LABEL__", escape(employee.qrLabel ?? employee.qrUrl))
    .replace("__EMAIL__", escape(employee.email));
}

const browser: Browser = await chromium.launch();
const page = await browser.newPage();

async function renderSide(html: string, outPath: string): Promise<void> {
  // setContent with file:// base so relative font URLs resolve into node_modules
  await page.goto(baseUrl); // sets the document base URL
  await page.setContent(html, { waitUntil: "networkidle" });
  // Brief settle for woff2 to fully apply before PDF capture
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

for (const variant of variants) {
  const frontOut = `${outDir}/${slug}-${variant}-front.pdf`;
  const backOut = `${outDir}/${slug}-${variant}-back.pdf`;
  await renderSide(fillFront(frontTemplate, variant), frontOut);
  await renderSide(fillBack(backTemplate), backOut);
  console.log(`[render] ${variant}: ${frontOut} + ${backOut}`);
}

await browser.close();
