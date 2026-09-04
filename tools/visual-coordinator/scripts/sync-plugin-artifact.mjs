import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = new URL("../dist/index.html", import.meta.url);
const target = new URL("../../../modules/orchestra/skills/visual-coordinator/examples/graph-builder.html", import.meta.url);
const built = (await readFile(source, "utf8")).replace(/[\t ]+$/gm, "");

if (process.argv.includes("--check")) {
  const published = await readFile(target, "utf8");
  if (published !== built) {
    throw new Error(`visual coordinator artifact is stale; run bun run sync:plugin (${fileURLToPath(target)})`);
  }
  console.log("visual coordinator plugin artifact is current");
} else {
  await writeFile(target, built);
  console.log(`updated ${fileURLToPath(target)}`);
}
