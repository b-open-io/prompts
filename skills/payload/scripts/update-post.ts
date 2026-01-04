/**
 * Update a Payload post using the Local API
 *
 * Usage: PAYLOAD_SECRET="..." DATABASE_URI="..." bunx tsx scripts/update-post.ts <slug> <content.json>
 *
 * This script uses Payload's Local API which bypasses REST authentication.
 * Run from within the Payload project directory with proper environment variables.
 */

import { getPayload } from "payload";
import configPromise from "@payload-config";
import { readFileSync } from "node:fs";

async function main() {
  const [slug, contentPath] = process.argv.slice(2);

  if (!slug) {
    console.error("Usage: bunx tsx update-post.ts <slug> [content.json]");
    console.error("  slug: Post slug to update");
    console.error("  content.json: Optional path to Lexical JSON content file");
    process.exit(1);
  }

  const payload = await getPayload({ config: configPromise });

  // Find the post by slug
  const result = await payload.find({
    collection: "posts",
    where: { slug: { equals: slug } },
    limit: 1,
  });

  if (result.docs.length === 0) {
    console.error(`Post not found: ${slug}`);
    process.exit(1);
  }

  const post = result.docs[0];
  console.log(`Found post: ${post.title} (ID: ${post.id})`);

  if (!contentPath) {
    // Just display post info
    console.log(JSON.stringify(post, null, 2));
    process.exit(0);
  }

  // Read and parse content file
  const contentJson = readFileSync(contentPath, "utf-8");
  const content = JSON.parse(contentJson);

  // Update the post
  const updated = await payload.update({
    collection: "posts",
    id: post.id,
    data: { content },
  });

  console.log(`Updated post: ${updated.title}`);
  console.log(`URL: ${process.env.NEXT_PUBLIC_SERVER_URL}/posts/${updated.slug}`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
