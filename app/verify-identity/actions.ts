"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { getStripe, identityReturnUrl } from "@/lib/stripe";
import { isAdult } from "@/lib/age";

const noticeSchema = z.object({ acceptBiometrics: z.literal("on") });
export type IdentityState = { message: string };

export async function startIdentityVerification(_prev: IdentityState, form: FormData): Promise<IdentityState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const parsed = noticeSchema.safeParse({ acceptBiometrics: form.get("acceptBiometrics") });
  if (!parsed.success) return { message: "Acknowledge Stripe's ID and selfie processing notice to continue." };
  if (!profile.dateOfBirth || !isAdult(profile.dateOfBirth)) return { message: "An 18+ date of birth must be recorded at signup before verification." };
  if (profile.tier !== "basic") redirect("/verify-identity");

  let sessionUrl: string | null = null;
  try {
    const stripe = getStripe();
    const admin = createAdminClient();
    if (profile.identityStatus === "pending" && profile.identityRef) {
      const existing = await stripe.identity.verificationSessions.retrieve(profile.identityRef);
      if (existing.livemode || existing.metadata?.user_id !== profile.id) throw new Error("Invalid session.");
      if (existing.status === "verified" || existing.status === "processing") {
        return { message: "Verification is being processed. Refresh this page in a moment for the result." };
      }
      if (existing.status === "canceled") {
        const { error } = await admin.from("profiles").update({ identity_status: "failed" })
          .eq("id", profile.id).eq("identity_ref", existing.id).eq("tier", "basic");
        if (error) throw new Error("Could not update status.");
        return { message: "This verification was canceled. Refresh this page to retry." };
      }
      sessionUrl = existing.url;
    } else {
      const session = await stripe.identity.verificationSessions.create({
        type: "document",
        options: { document: { require_matching_selfie: true, require_live_capture: true } },
        metadata: { user_id: profile.id },
        return_url: identityReturnUrl(),
      }, { idempotencyKey: `identity:${profile.id}:${profile.identityRef ?? "initial"}` });
      if (session.livemode || !session.url) throw new Error("Invalid session.");
      // Compare-and-set prevents concurrent starts or old webhooks from replacing
      // a newer attempt. Only a signed webhook can promote the tier.
      let update = admin.from("profiles").update({ identity_status: "pending", identity_ref: session.id })
        .eq("id", profile.id).eq("tier", "basic").eq("identity_status", profile.identityStatus);
      update = profile.identityRef ? update.eq("identity_ref", profile.identityRef) : update.is("identity_ref", null);
      const { data, error } = await update.select("id");
      if (error) throw new Error("Could not save session.");
      if (!data?.length) return { message: "Your verification changed. Refresh this page to continue." };
      sessionUrl = session.url;
    }
  } catch {
    return { message: "Couldn't start verification. Please try again or contact the project administrator." };
  }
  if (!sessionUrl) return { message: "Verification is processing. Refresh this page in a moment." };
  redirect(sessionUrl);
}
