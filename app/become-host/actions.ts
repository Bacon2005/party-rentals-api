"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireTier } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { HOST_AGREEMENT_VERSION } from "@/lib/consents";

const agreementSchema = z.object({ agree: z.literal("on", { error: "Accept the host agreement to continue." }) });
export type HostAgreementState = { message: string };

export async function becomeHost(_prev: HostAgreementState, form: FormData): Promise<HostAgreementState> {
  const profile = await requireTier("verified_guest");
  const parsed = agreementSchema.safeParse({ agree: form.get("agree") });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const { error } = await createAdminClient().rpc("accept_host_agreement", {
    p_user_id: profile.id, p_version: HOST_AGREEMENT_VERSION,
  });
  if (error) return { message: "Couldn't save your host agreement. Please try again." };
  // TODO: Payout onboarding is skipped for this school project.
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
