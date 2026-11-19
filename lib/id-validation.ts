import { z } from "zod";

export const MAX_ID_BYTES = 5 * 1024 * 1024;
export const REJECT_REASONS = [
  "Blurry/unreadable",
  "Name does not match account",
  "Invalid or edited ID",
  "Appears under 18",
  "Other",
] as const;
export const uploadIdSchema = z.object({
  idType: z.enum(["government", "student"]),
  image: z
    .instanceof(File)
    .refine(
      (f) => f.size > 0 && f.size <= MAX_ID_BYTES,
      "Choose an image up to 5 MB.",
    ),
});
export const submissionIdSchema = z.uuid();
export const reviewSchema = z
  .object({
    submissionId: submissionIdSchema,
    decision: z.enum(["approved", "rejected"]),
    reason: z.enum(REJECT_REASONS).nullable(),
    confirmReview: z.string().nullable(),
  })
  .refine(
    (v) => v.decision !== "rejected" || v.reason !== null,
    "Choose a rejection reason.",
  )
  .refine(
    (v) => v.decision !== "approved" || v.confirmReview === "on",
    "Confirm that you compared the ID with the account details.",
  );

// Inspect content, never the uploaded filename or browser-provided MIME type.
export function detectIdImage(
  bytes: Uint8Array,
): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (bytes.length > MAX_ID_BYTES) return null;
  const matches = (offset: number, values: number[]) =>
    values.every((v, i) => bytes[offset + i] === v);
  if (
    bytes.length >= 4 &&
    matches(0, [255, 216, 255]) &&
    matches(bytes.length - 2, [255, 217])
  )
    return { ext: "jpg", mime: "image/jpeg" };
  if (
    bytes.length >= 45 &&
    matches(0, [137, 80, 78, 71, 13, 10, 26, 10]) &&
    matches(12, [73, 72, 68, 82]) &&
    matches(bytes.length - 8, [73, 69, 78, 68, 174, 66, 96, 130])
  )
    return { ext: "png", mime: "image/png" };
  if (
    bytes.length >= 20 &&
    matches(0, [82, 73, 70, 70]) &&
    matches(8, [87, 69, 66, 80]) &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
      4,
      true,
    ) ===
      bytes.length - 8 &&
    ["VP8 ", "VP8L", "VP8X"].includes(
      String.fromCharCode(...bytes.slice(12, 16)),
    )
  )
    return { ext: "webp", mime: "image/webp" };
  return null;
}

export type IdSubmission = {
  id: string;
  user_id: string;
  id_type: "government" | "student";
  file_path: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  uploaded_at: string | null;
};
