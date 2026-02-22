export async function uploadToR2(file: File, meta: {
  companyId: string;
  vehicleId: string;
}) {
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...meta,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });

  const { uploadUrl, publicUrl } = await res.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

  return publicUrl;
}