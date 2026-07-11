/**
 * Upload dev seed fixtures to MinIO.
 *
 * Shared constants (keep in sync with supabase/seed.sql):
 *   SEED_SHARED_BPS      = seed-shared.bps
 *   SEED_APPROVED_SLUG   = seed-emerald-demo
 *   SEED_PENDING_SLUG    = seed-pending-demo
 *
 * Usage:
 *   npm run seed:storage
 *
 * Requires MinIO/S3 env vars (S3_ENDPOINT, S3_PORT, etc.) and PATCHES_BUCKET.
 * Cover seeding also requires COVERS_BUCKET and network access to placehold.co.
 */

import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "minio";

export const SEED_SHARED_BPS = "seed-shared.bps";
const PATCHES_BUCKET = process.env.PATCHES_BUCKET || "patches";
const COVERS_BUCKET = process.env.COVERS_BUCKET || "covers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../public/patches/example_patch.bps");

/** Hacks that get ≥3 cover images (all complete seeded hacks). */
const COMPLETE_HACK_SLUGS = [
  "seed-emerald-demo",
  "seed-pending-ready",
  "seed-patcher-only-admin-1",
  "seed-patcher-only-admin-2",
  "seed-patcher-only-admin-3",
  "seed-patcher-only-creator-1",
  "seed-patcher-only-creator-2",
  "seed-patcher-only-creator-3",
  "seed-patcher-only-creator2-1",
  "seed-patcher-only-creator2-2",
  "seed-patcher-only-creator2-3",
  "seed-all-downloads",
  "seed-current-only",
  "seed-draft-version",
  "seed-archived-version",
  "seed-archive-info",
  "seed-archive-download",
  "seed-third-party",
];

const COVER_PALETTES = [
  { bg: "1a1a2e", text: "ffffff" },
  { bg: "16213e", text: "e94560" },
  { bg: "0f3460", text: "ffffff" },
  { bg: "2d6a4f", text: "ffffff" },
  { bg: "40916c", text: "d8f3dc" },
  { bg: "5c4d7d", text: "ffffff" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Load env via npm run seed:storage (uses --env-file flags) or export vars manually.");
    process.exit(1);
  }
  return value;
}

async function ensureBucket(client, bucket) {
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    console.log(`Creating bucket "${bucket}"...`);
    await client.makeBucket(bucket, "");
  }
}

function coverObjectKey(slug, index) {
  return `${slug}/cover-${index}.png`;
}

function placeholdUrl(slug, index) {
  const palette = COVER_PALETTES[(slug.length + index) % COVER_PALETTES.length];
  const label = slug.replace(/^seed-/, "").replace(/-/g, " ");
  const text = encodeURIComponent(`Cover ${index}\n${label}`);
  return `https://placehold.co/240x160/${palette.bg}/${palette.text}/png?text=${text}`;
}

async function uploadSharedPatch(client) {
  if (!existsSync(FIXTURE_PATH)) {
    console.error(`Fixture not found: ${FIXTURE_PATH}`);
    console.error("Expected public/patches/example_patch.bps (Pokémon Emerald dev patch).");
    process.exit(1);
  }

  const { size } = await stat(FIXTURE_PATH);
  console.log(`Uploading ${FIXTURE_PATH} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`  → ${PATCHES_BUCKET}/${SEED_SHARED_BPS}`);

  await client.fPutObject(PATCHES_BUCKET, SEED_SHARED_BPS, FIXTURE_PATH, {
    "Content-Type": "application/octet-stream",
  });
}

async function uploadCovers(client) {
  let uploaded = 0;

  for (const slug of COMPLETE_HACK_SLUGS) {
    for (let i = 1; i <= 3; i++) {
      const objectKey = coverObjectKey(slug, i);
      const url = placeholdUrl(slug, i);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`placehold.co fetch failed for ${slug} cover ${i}: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await client.putObject(COVERS_BUCKET, objectKey, buffer, buffer.length, {
        "Content-Type": "image/png",
      });
      uploaded++;
    }
  }

  console.log(`Uploaded ${uploaded} cover images to ${COVERS_BUCKET}/`);
}

async function main() {
  const endPoint = requireEnv("S3_ENDPOINT");
  const port = parseInt(requireEnv("S3_PORT"), 10);
  const accessKey = requireEnv("S3_ACCESS_KEY_ID");
  const secretKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const useSSL = process.env.S3_USE_SSL === "true";

  const client = new Client({ endPoint, port, accessKey, secretKey, useSSL });

  await ensureBucket(client, PATCHES_BUCKET);
  await ensureBucket(client, COVERS_BUCKET);

  await uploadSharedPatch(client);
  await uploadCovers(client);

  console.log("Done.");
  console.log("");
  console.log("To test in-browser patching:");
  console.log("  1. Open /hack/seed-emerald-demo");
  console.log("  2. Link a local Pokémon Emerald ROM (CRC32: 1f1c08fb)");
  console.log("  3. Patch and download");
}

main().catch((err) => {
  console.error("seed:storage failed:", err.message || err);
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    console.error("Is MinIO running and reachable at S3_ENDPOINT:S3_PORT?");
  }
  process.exit(1);
});
