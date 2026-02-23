import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(req: Request, tenant: string) {
  const form = await req.formData();
  const file = form.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const blob = await put(`${tenant}/${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
