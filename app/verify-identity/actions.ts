"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { isAdult } from "@/lib/age";
import {
  uploadIdSchema,
  detectIdImage,
  submissionIdSchema,
} from "@/lib/id-validation";
import {
  ID_BUCKET,
  cleanIncompleteUpload,
  getLatestSubmission,
} from "@/lib/id-storage";

export type UploadState = { message: string };
export async function uploadId(
  _prev: UploadState,
  form: FormData,
): Promise<UploadState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.tier !== "basic" || profile.identityStatus === "verified")
    return { message: "Your ID is already verified." };
  if (!profile.dateOfBirth || !isAdult(profile.dateOfBirth))
    return {
      message: "An adult DOB must be recorded at signup before verification.",
    };
  const parsed = uploadIdSchema.safeParse({
    idType: form.get("idType"),
    image: form.get("image"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const bytes = new Uint8Array(await parsed.data.image.arrayBuffer());
  const imageType = detectIdImage(bytes);
  if (!imageType)
    return {
      message:
        "Choose a JPEG, PNG or WebP image. File contents must match an image format.",
    };
  const admin = createAdminClient();
  const id = randomUUID();
  const { error: reserveError } = await admin.rpc("reserve_id_submission", {
    p_id: id,
    p_user_id: profile.id,
    p_id_type: parsed.data.idType,
    p_ext: imageType.ext,
  });
  if (reserveError)
    return {
      message:
        reserveError.code === "23505"
          ? "You already have an ID under review."
          : "Couldn't reserve your upload. Refresh your status before trying again.",
    };
  const path = `${profile.id}/${id}.${imageType.ext}`;
  try {
    const { error } = await admin.storage
      .from(ID_BUCKET)
      .upload(path, bytes, {
        contentType: imageType.mime,
        cacheControl: "0",
        upsert: false,
      });
    if (error) throw new Error("Upload failed.");
  } catch {
    const cleaned = await cleanIncompleteUpload(id, profile.id, true).catch(
      () => false,
    );
    revalidatePath("/verify-identity");
    return {
      message: cleaned
        ? "Upload failed and was discarded. Please try again."
        : "Upload failed. Cleanup is still needed; refresh your status. An interrupted upload can be discarded after 10 minutes, or an admin can retry cleanup.",
    };
  }
  const { data: finished, error: finishError } = await admin.rpc(
    "finish_id_submission",
    { p_id: id, p_user_id: profile.id },
  );
  if (finishError || finished !== true) {
    // A lost RPC response may still have committed. Do not delete a ready image.
    const latest = await getLatestSubmission(profile.id).catch(() => undefined);
    if (latest === null || (latest && latest.id !== id)) {
      // Account deletion or a discarded attempt can remove the reservation
      // while Storage is uploading. Compensate using our generated path.
      const { error: removeError } = await admin.storage
        .from(ID_BUCKET)
        .remove([path]);
      return {
        message: removeError
          ? "Submission ended before upload completed. Image cleanup still needs attention; contact the admin team."
          : "Submission ended before upload completed. Please refresh your status.",
      };
    }
    if (!latest || latest.id !== id || !latest.uploaded_at) {
      if (latest?.id === id && !latest.uploaded_at) {
        const cleaned = await cleanIncompleteUpload(id, profile.id, true).catch(
          () => false,
        );
        if (cleaned)
          return {
            message:
              "Submission could not be saved. The upload was discarded; please try again.",
          };
      }
      // Keep the durable row/path on an uncertain DB result; the page/admin queue
      // exposes a retry instead of leaving an untracked Storage object.
      return {
        message:
          "The image was uploaded, but submission could not be confirmed. Refresh status. If interrupted, discard it after 10 minutes and retry.",
      };
    }
  }
  revalidatePath("/verify-identity");
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
