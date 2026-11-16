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

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Normalizes Philippine mobile numbers into a single canonical format so the app stores
// and validates phone numbers consistently across different user input styles.
function normalizePhPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, "");
  const match = cleaned.match(/^(?:\+63|63|0)(9\d{9})$/);
  return match ? `+63${match[1]}` : null;
}

// Updates the signed-in user's profile data, validates all form fields, and uploads a new
// avatar to storage before saving the profile record to the database.
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await verifyUser();

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const hostName = String(formData.get("hostName") ?? "").trim();
  const avatar = formData.get("avatar");

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Enter your full name.";
  else if (name.length > 80)
    fieldErrors.name = "Keep your name under 80 characters.";

  let phone: string | null = null;
  if (phoneRaw) {
    phone = normalizePhPhone(phoneRaw);
    if (!phone)
      fieldErrors.phone =
        "Enter a valid PH mobile number, like +63 917 123 4567.";
  }

  if (hostName.length > 80)
    fieldErrors.hostName = "Keep your host name under 80 characters.";

  const hasNewAvatar = avatar instanceof File && avatar.size > 0;
  if (hasNewAvatar) {
    if (!AVATAR_TYPES[avatar.type])
      fieldErrors.avatar = "Use a JPG, PNG, or WebP image.";
    else if (avatar.size > MAX_AVATAR_BYTES)
      fieldErrors.avatar = "Image must be 2 MB or smaller.";
  }

  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };

  let avatarUrl = profile.avatarUrl;

  if (hasNewAvatar) {
    const admin = createAdminClient();
    const path = `${profile.id}/avatar-${Date.now()}.${AVATAR_TYPES[avatar.type]}`;

    const { error: uploadError } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatar, { contentType: avatar.type });
    if (uploadError)
      return { ok: false, message: "Couldn't upload your photo. Try again." };

    const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    // Clean up the previous photo so old files don't pile up.
    if (profile.avatarUrl) {
      const marker = `/${AVATAR_BUCKET}/`;
      const idx = profile.avatarUrl.indexOf(marker);
      if (idx !== -1)
        await admin.storage
          .from(AVATAR_BUCKET)
          .remove([profile.avatarUrl.slice(idx + marker.length)])
          .catch(() => {});
    }
    avatarUrl = data.publicUrl;
  }

  try {
    await db
      .update(profiles)
      .set({ name, phone, hostName: hostName || null, avatarUrl })
      .where(eq(profiles.id, profile.id));
  } catch {
    return { ok: false, message: "Couldn't save your changes. Try again." };
  }

  revalidatePath("/", "layout"); // refreshes the avatar/name in your header
  return { ok: true, message: "Changes saved." };
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
