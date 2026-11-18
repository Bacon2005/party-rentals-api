"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-review";
import { reviewSchema, submissionIdSchema, type IdSubmission } from "@/lib/id-validation";
import { cleanIncompleteUpload, deleteReviewedImage } from "@/lib/id-storage";

export type ReviewState = {message:string};
function refreshReview() {
  revalidatePath("/admin/verifications"); revalidatePath("/verify-identity"); revalidatePath("/dashboard");
}
export async function reviewSubmission(_prev:ReviewState,form:FormData):Promise<ReviewState> {
  const {userId,admin} = await requireAdmin();
  const parsed = reviewSchema.safeParse({submissionId:form.get("submissionId"),decision:form.get("decision"),reason:form.get("reason"),confirmReview:form.get("confirmReview")});
  if (!parsed.success) return {message:parsed.error.issues[0].message};
  const {error,data:changed} = await admin.rpc("review_id_submission",{
    p_id:parsed.data.submissionId,p_admin_id:userId,p_decision:parsed.data.decision,p_reason:parsed.data.reason,
  });
  if (error) return {message:"Decision could not be saved. Refresh the queue and retry."};
  const deleted = await deleteReviewedImage(parsed.data.submissionId).catch(() => false);
  refreshReview();
  // TODO: Email the outcome; current decisions are shown in-app only.
  if (!deleted) return {message:"Decision saved, but image deletion failed. Use Retry image deletion in the cleanup queue."};
  return {message:changed ? "Decision saved. ID image deleted." : "Already reviewed; the decision was unchanged. ID image deleted."};
}

export async function retryImageDeletion(_prev:ReviewState,form:FormData):Promise<ReviewState> {
  await requireAdmin();
  const parsed = submissionIdSchema.safeParse(form.get("submissionId"));
  if (!parsed.success) return {message:"Invalid submission."};
  const deleted = await deleteReviewedImage(parsed.data).catch(() => false);
  refreshReview();
  return {message:deleted ? "Image deleted." : "Image deletion still needs attention. Please retry."};
}

export async function discardAdminUpload(_prev:ReviewState,form:FormData):Promise<ReviewState> {
  const {admin} = await requireAdmin();
  const parsed = submissionIdSchema.safeParse(form.get("submissionId"));
  if (!parsed.success) return {message:"Invalid submission."};
  const {data,error} = await admin.from("id_submissions").select("*").eq("id",parsed.data).returns<IdSubmission[]>().maybeSingle();
  if (error || !data) return {message:"Submission not found."};
  const cleaned = await cleanIncompleteUpload(data.id,data.user_id).catch(() => false);
  refreshReview();
  return {message:cleaned ? "Interrupted upload discarded." : "Only unfinished uploads older than 10 minutes can be discarded. If cleanup failed, retry."};
}
