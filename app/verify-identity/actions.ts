"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { submissionIdSchema } from "@/lib/id-validation";
import { cleanIncompleteUpload } from "@/lib/id-storage";
import { submitId } from "@/lib/id-upload";

export type UploadState = { message: string };

export async function uploadId(
  _prev: UploadState,
  form: FormData,
): Promise<UploadState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const result = await submitId(profile, form);
  revalidatePath("/verify-identity");
  if (!result.ok) return { message: result.message };
  redirect("/verify-identity");
}

export async function discardInterruptedUpload(
  _prev: UploadState,
  form: FormData,
): Promise<UploadState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const parsed = submissionIdSchema.safeParse(form.get("submissionId"));
  if (!parsed.success) return { message: "Invalid submission." };
  const cleaned = await cleanIncompleteUpload(parsed.data, profile.id).catch(
    () => false,
  );
  revalidatePath("/verify-identity");
  return {
    message: cleaned
      ? "Interrupted upload discarded. Refresh to submit again."
      : "Cleanup could not finish. Wait 10 minutes after starting the upload, then retry or contact the admin team.",
  };
}
