import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { toAccountDto } from "@/lib/account-dto";
import { cleanIncompleteUpload, getLatestSubmission } from "@/lib/id-storage";
import { submissionIdSchema } from "@/lib/id-validation";
import { submitId } from "@/lib/id-upload";

export async function GET(request: Request) {
  try {
    const profile = await getProfile(request);
    if (!profile)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const latest = await getLatestSubmission(profile.id);
    return NextResponse.json({
      profile: toAccountDto(profile),
      submission: latest
        ? {
            id: latest.id,
            id_type: latest.id_type,
            status: latest.status,
            reject_reason: latest.reject_reason,
            created_at: latest.created_at,
            uploaded_at: latest.uploaded_at,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load verification status." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getProfile(request);
    if (!profile)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (Number(request.headers.get("content-length")) > 6 * 1024 * 1024)
      return NextResponse.json(
        { error: "Choose an image up to 5 MB." },
        { status: 413 },
      );
    const form = await request.formData().catch(() => null);
    if (!form)
      return NextResponse.json(
        { error: "Invalid ID submission." },
        { status: 400 },
      );
    const result = await submitId(profile, form);
    return NextResponse.json(result, { status: result.ok ? 201 : 400 });
  } catch {
    return NextResponse.json(
      {
        error: "Could not submit your ID. Refresh status before trying again.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getProfile(request);
    if (!profile)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null);
    const parsed = submissionIdSchema.safeParse(body?.submissionId);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid submission." },
        { status: 400 },
      );
    const cleaned = await cleanIncompleteUpload(parsed.data, profile.id);
    return NextResponse.json(
      {
        ok: cleaned,
        message: cleaned
          ? "Interrupted upload discarded. You can submit again."
          : "Cleanup could not finish. Wait 10 minutes after starting the upload, then retry or contact the admin team.",
      },
      { status: cleaned ? 200 : 409 },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not discard the interrupted upload." },
      { status: 500 },
    );
  }
}
