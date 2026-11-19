// Run daily from a trusted server: node --env-file=.env scripts/purge-id-submissions.mjs
// Never expose this service-role maintenance task as a public route.
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Server credentials are required.");
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const { data: old, error } = await admin
  .from("id_submissions")
  .select("id")
  .eq("status", "pending")
  .lt("created_at", cutoff)
  .order("created_at")
  .limit(100);
if (error) throw new Error("Could not read expired submissions.");
let failures = 0;
for (const row of old ?? []) {
  const { error: expireError } = await admin.rpc("expire_id_submission", {
    p_id: row.id,
  });
  if (expireError) failures++;
}
// Also retry retained images from previous review/deletion failures.
const { data: files, error: readError } = await admin
  .from("id_submissions")
  .select("id,file_path")
  .neq("status", "pending")
  .not("file_path", "is", null)
  .order("created_at")
  .limit(100);
if (readError) throw new Error("Could not read image cleanup queue.");
for (const row of files ?? []) {
  const { error: removeError } = await admin.storage
    .from("id-submissions")
    .remove([row.file_path]);
  if (removeError) {
    failures++;
    continue;
  }
  const { error: clearError } = await admin
    .from("id_submissions")
    .update({ file_path: null })
    .eq("id", row.id)
    .eq("file_path", row.file_path)
    .neq("status", "pending");
  if (clearError) failures++;
}
// Auth deletion cascades can remove tracking rows; scan the bucket as well for
// unreferenced objects older than 30 days. Only generated UUID/UUID.ext paths
// are eligible. Gather pages before deleting so offsets do not skip objects.
async function listAll(prefix) {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error: listError } = await admin.storage
      .from("id-submissions")
      .list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (listError) throw new Error("Could not scan expired ID images.");
    items.push(...data);
    if (data.length < 100) return items;
  }
}
let orphanImagesDeleted = 0;
for (const folder of await listAll("")) {
  if (!/^[a-f0-9-]{36}$/.test(folder.name) || folder.id) continue;
  for (const image of await listAll(folder.name)) {
    if (
      !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image.name) ||
      !image.created_at ||
      image.created_at >= cutoff
    )
      continue;
    const imagePath = `${folder.name}/${image.name}`;
    const { data: tracked, error: trackError } = await admin
      .from("id_submissions")
      .select("id")
      .eq("file_path", imagePath)
      .limit(1);
    if (trackError) {
      failures++;
      continue;
    }
    if (tracked.length) continue;
    const { error: orphanError } = await admin.storage
      .from("id-submissions")
      .remove([imagePath]);
    if (orphanError) failures++;
    else orphanImagesDeleted++;
  }
}
// Counts only: no user identifiers, file paths, names or image contents in logs.
console.log(
  JSON.stringify({
    expiredBatch: old?.length ?? 0,
    cleanupBatch: files?.length ?? 0,
    orphanImagesDeleted,
    failures,
  }),
);
if (failures) process.exitCode = 1;
