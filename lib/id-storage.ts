import "server-only";
import { createAdminClient } from "@/lib/admin";
import type { IdSubmission } from "@/lib/id-validation";

export const ID_BUCKET = "id-submissions";

export async function getLatestSubmission(userId: string) {
  const { data, error } = await createAdminClient().from("id_submissions").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).returns<IdSubmission[]>();
  if (error) throw new Error("Could not read submission status.");
  return data?.[0] ?? null;
}

// Preserve the row/path if either service fails, so admins have a durable retry
// target. Only incomplete uploads may be canceled; never delete a ready image.
export async function cleanIncompleteUpload(id: string, userId: string, immediate = false): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("id_submissions").select("*").eq("id",id).eq("user_id",userId).returns<IdSubmission[]>().maybeSingle();
  if (error) return false;
  if (!data) return true;
  if (data.status !== "pending" || data.uploaded_at || (!immediate && Date.now()-Date.parse(data.created_at) < 10*60*1000)) return false;
  if (data.file_path) {
    const { error: removeError } = await admin.storage.from(ID_BUCKET).remove([data.file_path]);
    if (removeError) return false;
  }
  const result = await admin.rpc("cancel_id_upload",{ p_id:id,p_user_id:userId,p_immediate:immediate });
  return !result.error && result.data === true;
}

// Called only after an authenticated admin's decision. A failed deletion leaves
// file_path in place and is displayed in the admin cleanup queue.
export async function deleteReviewedImage(submissionId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("id_submissions").select("*").eq("id",submissionId).returns<IdSubmission[]>().maybeSingle();
  if (error || !data || data.status === "pending") return false;
  if (!data.file_path) return true;
  const { error: removeError } = await admin.storage.from(ID_BUCKET).remove([data.file_path]);
  if (removeError) return false;
  const { error: clearError } = await admin.from("id_submissions").update({file_path:null}).eq("id",data.id).eq("file_path",data.file_path).neq("status","pending");
  return !clearError;
}
