import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import type { Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { detectIdImage } from "@/lib/id-validation";

export type ProfileUpdateResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export const AVATAR_BUCKET = "avatars";
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

export async function saveProfile(
  profile: Profile,
  formData: FormData,
): Promise<ProfileUpdateResult> {
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
  let avatarType: ReturnType<typeof detectIdImage> = null;
  if (hasNewAvatar) {
    if (!AVATAR_TYPES[avatar.type])
      fieldErrors.avatar = "Use a JPG, PNG, or WebP image.";
    else if (avatar.size > MAX_AVATAR_BYTES)
      fieldErrors.avatar = "Image must be 2 MB or smaller.";
    else {
      avatarType = detectIdImage(new Uint8Array(await avatar.arrayBuffer()));
      if (!avatarType)
        fieldErrors.avatar = "Use a valid JPG, PNG, or WebP image.";
    }
  }

  if (Object.keys(fieldErrors).length > 0)
    return { ok: false, message: "Fix the highlighted fields.", fieldErrors };

  let avatarUrl = profile.avatarUrl;
  let uploadedPath: string | null = null;

  if (hasNewAvatar && avatarType) {
    const admin = createAdminClient();
    const path = `${profile.id}/avatar-${crypto.randomUUID()}.${avatarType.ext}`;

    const { error: uploadError } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatar, { contentType: avatarType.mime });
    if (uploadError)
      return { ok: false, message: "Couldn't upload your photo. Try again." };

    const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);

    uploadedPath = path;
    avatarUrl = data.publicUrl;
  }

  try {
    await db
      .update(profiles)
      .set({ name, phone, hostName: hostName || null, avatarUrl })
      .where(eq(profiles.id, profile.id));
  } catch {
    if (uploadedPath)
      await createAdminClient()
        .storage.from(AVATAR_BUCKET)
        .remove([uploadedPath])
        .catch(() => {});
    return { ok: false, message: "Couldn't save your changes. Try again." };
  }

  // Replace the database pointer before deleting the old photo.
  if (uploadedPath && profile.avatarUrl) {
    const marker = `/${AVATAR_BUCKET}/`;
    const idx = profile.avatarUrl.indexOf(marker);
    const oldPath =
      idx === -1 ? "" : profile.avatarUrl.slice(idx + marker.length);
    if (oldPath.startsWith(`${profile.id}/`))
      await createAdminClient()
        .storage.from(AVATAR_BUCKET)
        .remove([oldPath])
        .catch(() => {});
  }

  return { ok: true, message: "Changes saved." };
}
