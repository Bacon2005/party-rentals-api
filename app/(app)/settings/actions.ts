"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { verifyUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "./ui";

import { AVATAR_BUCKET, saveProfile } from "@/lib/profile-settings";

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await verifyUser();
  const result = await saveProfile(profile, formData);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

// Validates the current password and, after confirming the new password matches, updates the
// authenticated user's password in Supabase.
export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await verifyUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: Record<string, string> = {};
  if (!current) fieldErrors.currentPassword = "Enter your current password.";
  if (next.length < 6) fieldErrors.newPassword = "Use at least 6 characters.";
  else if (next === current)
    fieldErrors.newPassword =
      "Choose a password different from your current one.";
  if (confirm !== next) fieldErrors.confirmPassword = "Passwords don't match.";

  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };

  const supabase = await createClient();

  // Supabase's updateUser doesn't check the old password, so verify it first.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: current,
  });
  if (verifyError)
    return {
      ok: false,
      message: "Fix the highlighted fields.",
      fieldErrors: { currentPassword: "Current password is incorrect." },
    };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Password updated." };
}

// Removes the user's stored avatar files, profile record, and Supabase auth account before
// signing the user out and redirecting them away from the app.
export async function deleteAccount(): Promise<FormState> {
  const profile = await verifyUser();
  const admin = createAdminClient();

  // Delete ID images before the Auth cascade removes their tracking rows.
  const { data: submissions, error: idReadError } = await admin
    .from("id_submissions")
    .select("file_path")
    .eq("user_id", profile.id)
    .not("file_path", "is", null)
    .returns<{ file_path: string }[]>();
  if (idReadError)
    return {
      ok: false,
      message: "Couldn't check ID image deletion. Please try again.",
    };
  if (submissions?.length) {
    const { error } = await admin.storage
      .from("id-submissions")
      .remove(submissions.map((s) => s.file_path));
    if (error)
      return {
        ok: false,
        message: "ID image deletion failed. Please retry account deletion.",
      };
  }

  // 1. Remove stored photos
  const { data: files } = await admin.storage
    .from(AVATAR_BUCKET)
    .list(profile.id);
  if (files?.length)
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove(files.map((f) => `${profile.id}/${f.name}`));

  // 2. Remove app data. If other tables reference profiles without ON DELETE CASCADE,
  //    this throws, so delete or cascade those rows first.
  try {
    await db.delete(profiles).where(eq(profiles.id, profile.id));
  } catch {
    return {
      ok: false,
      message:
        "Couldn't delete your account. Remove your events and bookings first.",
    };
  }

  // 3. Remove the login itself
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error)
    return { ok: false, message: "Couldn't delete your account. Try again." };

  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => {});
  redirect("/login");
}
