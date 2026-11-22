import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { toAccountDto } from "@/lib/account-dto";
import { saveProfile } from "@/lib/profile-settings";

export async function GET(request: Request) {
  try {
    const profile = await getProfile(request);
    if (!profile)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ profile: toAccountDto(profile) });
  } catch {
    return NextResponse.json(
      { error: "Could not load your profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getProfile(request);
    if (!profile)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (Number(request.headers.get("content-length")) > 3 * 1024 * 1024)
      return NextResponse.json(
        { error: "Profile photo must be 2 MB or smaller." },
        { status: 413 },
      );
    const form = await request.formData().catch(() => null);
    if (!form)
      return NextResponse.json(
        { error: "Invalid profile form." },
        { status: 400 },
      );
    const result = await saveProfile(profile, form);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { error: "Could not save your profile. Please try again." },
      { status: 500 },
    );
  }
}
