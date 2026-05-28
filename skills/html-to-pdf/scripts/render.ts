#!/usr/bin/env bun
/**
 * Generic HTML → PDF renderer for the templates/ tree.
 *
 * IMPORTANT: this script resolves all paths relative to process.cwd().
 * Run from the directory that contains `node_modules/` and `templates/`
 * (i.e. the skill copy at your project root), not from anywhere else.
 *
 * Layout convention:
 *   templates/<template>/<style>/[<theme>/]card.html
 *   templates/<template>/<style>/[<theme>/]card-back.html
 *   templates/<template>/<style>/assets/...        ← __ASSETS__
 *   templates/<template>/employees/<slug>.json
 *
 * Path placeholders in the HTML are substituted at render time:
 *   __NODE_MODULES__/... → ./node_modules/...       (fonts, icons)
 *   __ASSETS__/...       → style-level assets dir
 *
 * Usage:
 *   bun render.ts --template business-cards --style minimal
 *   bun render.ts --template business-cards --style watercolor --theme light \
 *     --photo templates/business-cards/employees/your-photo.png
 *   bun render.ts --template business-cards --style watercolor --theme dark \
 *     --photo path/to/portrait.png --logo path/to/your-logo.svg
 *
 * Flags:
 *   --template <name>     deliverable type (default: business-cards)
 *   --style <name>        visual style (default: minimal)
 *   --theme <name>        theme variant (omit for single-theme styles)
 *   --employee <slug>     employees/<slug>.json (default: example)
 *   --photo <path>        portrait path for templates with __PHOTO_SRC__
 *   --logo <path>         SVG/PNG to overlay in the QR center (optional)
 */
import { chromium, type Browser } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { renderArtisticQR } from "./qr-artistic.ts";

type Employee = {
  name: string; title: string; email: string;
  handle?: string; phone?: string;
  qrUrl: string; qrLabel?: string;
};

// CLI argument parser — tiny and dependency-free
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      out[a.slice(2)] = argv[i + 1] ?? "true";
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const template = args.template ?? "business-cards";
const style = args.style ?? "minimal";
const theme = args.theme; // undefined OK
const employeeSlug = args.employee ?? "example";
// Photo is only used by templates that include __PHOTO_SRC__ (e.g. watercolor).
// Pass --photo <relative-path> to point at a pixel-art portrait alongside the
// employee JSON. Defaults to an empty string so the substitution is silent
// when the template doesn't need it.
const photoRelative = args.photo ?? "";
// QR center logo is optional and decoupled from any single brand. Pass
// --logo <path> to overlay your own SVG/PNG mark in the center of the QR.
// Without it, the QR renders without an overlay (still valid, just cleaner).
const logoPath = args.logo;
const logoSvg = logoPath && existsSync(resolve(logoPath))
  ? readFileSync(resolve(logoPath), "utf8")
  : undefined;

const employeePath = resolve(`templates/${template}/employees/${employeeSlug}.json`);
const styleDir = `templates/${template}/${style}`;
const themePath = theme ? `${styleDir}/${theme}` : styleDir;
const frontPath = resolve(`${themePath}/card.html`);
const backPath = resolve(`${themePath}/card-back.html`);

if (!existsSync(employeePath)) {
  console.error(`[render] employee file not found: ${employeePath}`);
  process.exit(1);
}
if (!existsSync(frontPath) || !existsSync(backPath)) {
  console.error(`[render] template files not found under ${themePath}`);
  process.exit(1);
}

const outDir = resolve("out");
mkdirSync(outDir, { recursive: true });

const employee: Employee = JSON.parse(readFileSync(employeePath, "utf8"));
const frontTemplate = readFileSync(frontPath, "utf8");
const backTemplate = readFileSync(backPath, "utf8");
const baseUrl = pathToFileURL(resolve("./") + "/").toString();

const qrSvg = await renderArtisticQR({
  url: employee.qrUrl,
  size: 1000,
  fg: "#0a0a0a",
  bg: "#ffffff",
  quietZone: 2,
  dotShape: "circle",
  logoSvg,
  logoScale: logoSvg ? 0.20 : undefined,
});

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyPlaceholders(html: string): string {
  return html
    .replace(/__NODE_MODULES__/g, "node_modules")
    .replace(/__ASSETS__/g, `${styleDir}/assets`);
}

function fillFront(html: string): string {
  return applyPlaceholders(html)
    .replace("__PHOTO_SRC__", photoRelative)
    .replace(/__NAME__/g, escape(employee.name))
    .replace("__TITLE__", escape(employee.title))
    .replace("__EMAIL__", escape(employee.email))
    .replace("__HANDLE__", escape(employee.handle ?? ""))
    .replace("__PHONE__", escape(employee.phone ?? ""));
}

function fillBack(html: string): string {
  return applyPlaceholders(html)
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

const suffix = theme ? `${style}-${theme}` : style;
const frontOut = `${outDir}/${employeeSlug}-${suffix}-front.pdf`;
const backOut = `${outDir}/${employeeSlug}-${suffix}-back.pdf`;
await renderSide(fillFront(frontTemplate), frontOut);
await renderSide(fillBack(backTemplate), backOut);

await browser.close();
console.log(`[render:${suffix}] ${frontOut} + ${backOut}`);
