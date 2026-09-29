import { Client } from "minio";

let cachedClient: Client | null = null;

export function getMinioClient(): Client {
  if (cachedClient) return cachedClient;
  const endPoint = process.env.S3_ENDPOINT!;
  const port = parseInt(process.env.S3_PORT!);
  const accessKey = process.env.S3_ACCESS_KEY_ID!;
  const secretKey = process.env.S3_SECRET_ACCESS_KEY!;
  const useSSL = process.env.S3_USE_SSL! === "true";

  cachedClient = new Client({ endPoint, accessKey, secretKey, useSSL, port });
  return cachedClient;
}

export const PATCHES_BUCKET = process.env.PATCHES_BUCKET!;

/** Whether an uploaded file actually landed, checked before a database row points at it. */
export async function objectExists(bucket: string, key: string) {
  try {
    await getMinioClient().statObject(bucket, key);
    return true;
  } catch {
    return false;
  }
}
export const COVERS_BUCKET = process.env.COVERS_BUCKET!;
