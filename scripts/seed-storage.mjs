/**
 * Upload dev seed fixtures to MinIO.
 *
 * Shared constants (keep in sync with supabase/seed.sql):
 *   SEED_PATCH_OBJECT_KEY = seed-emerald-demo-1.0.bps
 *   SEED_PATCH_BUCKET     = patches
 *
 * Usage:
 *   npm run seed:storage
 *
 * Requires MinIO/S3 env vars (S3_ENDPOINT, S3_PORT, etc.) and a running bucket.
 */

import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "minio";

const SEED_PATCH_OBJECT_KEY = "seed-emerald-demo-1.0.bps";
const SEED_PATCH_BUCKET = process.env.PATCHES_BUCKET || "patches";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../public/patches/example_patch.bps");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    console.error("Load env via npm run seed:storage (uses --env-file flags) or export vars manually.");
    process.exit(1);
  }
  return value;
}

async function main() {
  if (!existsSync(FIXTURE_PATH)) {
    console.error(`Fixture not found: ${FIXTURE_PATH}`);
    console.error("Expected public/patches/example_patch.bps (Pokémon Emerald dev patch).");
    process.exit(1);
  }

  const endPoint = requireEnv("S3_ENDPOINT");
  const port = parseInt(requireEnv("S3_PORT"), 10);
  const accessKey = requireEnv("S3_ACCESS_KEY_ID");
  const secretKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const useSSL = process.env.S3_USE_SSL === "true";

  const client = new Client({ endPoint, port, accessKey, secretKey, useSSL });

  const bucketExists = await client.bucketExists(SEED_PATCH_BUCKET);
  if (!bucketExists) {
    console.log(`Creating bucket "${SEED_PATCH_BUCKET}"...`);
    await client.makeBucket(SEED_PATCH_BUCKET, "");
  }

  const { size } = await stat(FIXTURE_PATH);
  console.log(`Uploading ${FIXTURE_PATH} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`  → ${SEED_PATCH_BUCKET}/${SEED_PATCH_OBJECT_KEY}`);

  await client.fPutObject(
    SEED_PATCH_BUCKET,
    SEED_PATCH_OBJECT_KEY,
    FIXTURE_PATH,
    { "Content-Type": "application/octet-stream" }
  );

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
