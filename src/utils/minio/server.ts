import { Client } from "minio";

let cachedClient: Client | null = null;

export function getMinioClient(): Client {
  if (cachedClient) return cachedClient;
  const endPoint = process.env.R2_ENDPOINT!;
  const port = parseInt(process.env.R2_PORT!);
  const accessKey = process.env.R2_ACCESS_KEY_ID!;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
  const useSSL = process.env.R2_USE_SSL! === "true";

  cachedClient = new Client({ endPoint, accessKey, secretKey, useSSL, port });
  return cachedClient;
}

export const PATCHES_BUCKET = "patches";


