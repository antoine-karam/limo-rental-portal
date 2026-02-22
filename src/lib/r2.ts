import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
export async function createUploadUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const cmd = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const url = await getSignedUrl(r2, cmd, {
    expiresIn: params.expiresInSeconds ?? 60,
  });

  return url;
}