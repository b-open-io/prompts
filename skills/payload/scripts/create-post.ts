/**
 * Create a Payload post using the Local API
 *
 * Usage: PAYLOAD_SECRET="..." DATABASE_URI="..." bunx tsx scripts/create-post.ts <title> <slug> <content.json>
 *
 * This script uses Payload's Local API which bypasses REST authentication.
 * Run from within the Payload project directory with proper environment variables.
 */

import { getPayload } from "payload";
import configPromise from "@payload-config";
import { readFileSync } from "node:fs";

async function main() {
  const [title, slug, contentPath] = process.argv.slice(2);

  if (!title || !slug || !contentPath) {
    console.error("Usage: bunx tsx create-post.ts <title> <slug> <content.json>");
    console.error("  title: Post title");
    console.error("  slug: URL slug for the post");
    console.error("  content.json: Path to Lexical JSON content file");
    process.exit(1);
  }

  const payload = await getPayload({ config: configPromise });

  // Check if slug already exists
  const existing = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.error(`Post with slug "${slug}" already exists (ID: ${existing.docs[0].id})`);
    process.exit(1);
  }

  // Read and parse content file
  const contentJson = readFileSync(contentPath, "utf-8");
  const content = JSON.parse(contentJson);

  // Create the post
  const post = await payload.create({
    collection: "posts",
    data: {
      title,
      slug,
      content,
      _status: "published",
    },
  });

  console.log(`Created post: ${post.title}`);
  console.log(`ID: ${post.id}`);
  console.log(`URL: ${process.env.NEXT_PUBLIC_SERVER_URL}/posts/${post.slug}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
