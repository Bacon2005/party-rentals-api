import { NextResponse } from "next/server";
import { requireApiTier } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { HOST_AGREEMENT_VERSION } from "@/lib/consents";

export async function POST(request: Request) {
  try {
    const gate = await requireApiTier(request, "verified_guest");
    if (gate.response) return gate.response;
    const body = await request.json().catch(() => null);
    if (body?.agree !== true)
      return NextResponse.json(
        { error: "Accept the host agreement to continue." },
        { status: 400 },
      );
    const { error } = await createAdminClient().rpc("accept_host_agreement", {
      p_user_id: gate.user.id,
      p_version: HOST_AGREEMENT_VERSION,
    });
    if (error)
      return NextResponse.json(
        { error: "Could not save your host agreement. Please try again." },
        { status: 500 },
      );
    return NextResponse.json({
      ok: true,
      message: "You are now a verified host.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save your host agreement. Please try again." },
      { status: 500 },
    );
  }
}
