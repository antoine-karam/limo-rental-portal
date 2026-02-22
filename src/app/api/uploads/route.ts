import { NextResponse } from "next/server";
import { createUploadUrl } from "@/lib/r2";

export async function POST(req: Request) {
  const { companyId, vehicleId, fileName, contentType } = await req.json();

  // basic sanitize
  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");

  const key = `fleet/${companyId}/${vehicleId}/${Date.now()}-${safeName}`;

  const uploadUrl = await createUploadUrl({
    bucket: process.env.R2_BUCKET!,
    key,
    contentType,
  });

  // Your public delivery base (custom domain or public bucket URL)
  const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl, key });
}