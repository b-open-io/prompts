/**
 * List Payload posts using the Local API
 *
 * Usage: PAYLOAD_SECRET="..." DATABASE_URI="..." bunx tsx scripts/list-posts.ts [limit]
 *
 * This script uses Payload's Local API which bypasses REST authentication.
 * Run from within the Payload project directory with proper environment variables.
 */

import { getPayload } from "payload";
import configPromise from "@payload-config";

async function main() {
  const limit = Number.parseInt(process.argv[2] || "20", 10);

  const payload = await getPayload({ config: configPromise });

  const result = await payload.find({
    collection: "posts",
    limit,
    sort: "-createdAt",
  });

  console.log(`Found ${result.totalDocs} posts (showing ${result.docs.length}):\n`);

  for (const post of result.docs) {
    const status = post._status || "draft";
    console.log(`- [${status}] ${post.title}`);
    console.log(`  Slug: ${post.slug}`);
    console.log(`  ID: ${post.id}`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
