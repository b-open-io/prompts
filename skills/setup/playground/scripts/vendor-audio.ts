import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const DEFAULT_ORIGIN = "https://bopen.ai";

type AudioAsset = {
  path: string;
  bytes: number;
  sha256: string;
};

type AudioManifest = {
  version: 1;
  files: AudioAsset[];
};

function registryOrigin() {
  const argumentIndex = process.argv.indexOf("--origin");
  const argument =
    argumentIndex === -1 ? undefined : process.argv[argumentIndex + 1];
  return (
    argument ??
    process.env.BOPEN_REGISTRY_ORIGIN ??
    DEFAULT_ORIGIN
  ).replace(/\/$/, "");
}

function isAudioManifest(value: unknown): value is AudioManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<AudioManifest>;
  return (
    manifest.version === 1 &&
    Array.isArray(manifest.files) &&
    manifest.files.every(
      (file) =>
        typeof file.path === "string" &&
        typeof file.bytes === "number" &&
        typeof file.sha256 === "string",
    )
  );
}

async function fetchRequired(url: URL) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response;
}

async function main() {
  const origin = registryOrigin();
  const manifestResponse = await fetchRequired(
    new URL("/r/sound-system-assets.json", origin),
  );
  const manifestValue: unknown = await manifestResponse.json();
  if (!isAudioManifest(manifestValue)) {
    throw new Error("The bopen sound-system asset manifest is invalid.");
  }

  const publicDirectory = resolve(process.cwd(), "public");
  await Promise.all(
    manifestValue.files.map(async (file) => {
      const destination = resolve(publicDirectory, file.path);
      const fromPublic = relative(publicDirectory, destination);
      if (fromPublic === ".." || fromPublic.startsWith(`..${sep}`)) {
        throw new Error(
          `Asset path escapes the public directory: ${file.path}`,
        );
      }

      const response = await fetchRequired(new URL(`/${file.path}`, origin));
      const content = new Uint8Array(await response.arrayBuffer());
      const sha256 = createHash("sha256").update(content).digest("hex");
      if (content.byteLength !== file.bytes || sha256 !== file.sha256) {
        throw new Error(`Integrity check failed for ${file.path}`);
      }

      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }),
  );

  console.log(
    `Installed ${manifestValue.files.length} bopen audio assets in public/audio/ui.`,
  );
}

await main();
