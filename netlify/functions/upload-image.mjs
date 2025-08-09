export const config = { path: "/.netlify/functions/upload-image" };

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  // Parse multipart form
  let form;
  try {
    form = await req.formData();
  } catch (e) {
    return new Response("Invalid form data", { status: 400 });
  }
  const file = form?.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return new Response("No image provided", { status: 400 });
  }

  // Use Netlify Blobs via context (no extra config needed on recent runtimes)
  const BUCKET = "uploads";
  const store = context?.blobs?.getStore ? context.blobs.getStore(BUCKET) : null;
  if (!store) {
    return new Response("Blobs API not available in this runtime", { status: 500 });
  }

  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const key = `admin/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? "." + ext : ""}`;

  const bytes = await file.arrayBuffer();
  await store.set(key, bytes, {
    contentType: file.type || "application/octet-stream",
    metadata: { source: "admin-upload" },
    visibility: "public",
  });

  const url = await store.getPublicUrl(key);
  return Response.json({ ok: true, url, key });
};
