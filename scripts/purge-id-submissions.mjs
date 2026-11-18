// Run daily from a trusted server: node --env-file=.env scripts/purge-id-submissions.mjs
// Never expose this service-role maintenance task as a public route.
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Server credentials are required.");
const admin = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const cutoff = new Date(Date.now()-30*24*60*60*1000).toISOString();
const {data:old,error} = await admin.from("id_submissions").select("id").eq("status","pending").lt("created_at",cutoff).order("created_at").limit(100);
if (error) throw new Error("Could not read expired submissions.");
let failures = 0;
for (const row of old ?? []) {
  const {error:expireError} = await admin.rpc("expire_id_submission",{p_id:row.id});
  if (expireError) failures++;
}
// Also retry retained images from previous review/deletion failures.
const {data:files,error:readError} = await admin.from("id_submissions").select("id,file_path").neq("status","pending").not("file_path","is",null).order("created_at").limit(100);
if (readError) throw new Error("Could not read image cleanup queue.");
for (const row of files ?? []) {
  const {error:removeError} = await admin.storage.from("id-submissions").remove([row.file_path]);
  if (removeError) { failures++; continue; }
  const {error:clearError} = await admin.from("id_submissions").update({file_path:null}).eq("id",row.id).eq("file_path",row.file_path).neq("status","pending");
  if (clearError) failures++;
}
// Counts only: no user identifiers, file paths, names or image contents in logs.
console.log(JSON.stringify({expiredBatch:old?.length ?? 0,cleanupBatch:files?.length ?? 0,failures}));
if (failures) process.exitCode=1;
