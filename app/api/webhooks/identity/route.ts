import type Stripe from "stripe";
import { z } from "zod";
import { createAdminClient } from "@/lib/admin";
import { getStripe, getIdentityResultsStripe } from "@/lib/stripe";
import { identityDobMatches } from "@/lib/identity-result";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return Response.json(
      { error: "Webhook is not configured." },
      { status: 503 },
    );
  if (!signature)
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (event.livemode)
    return Response.json(
      { error: "Only test events are accepted." },
      { status: 400 },
    );

  switch (event.type) {
    case "identity.verification_session.verified":
    case "identity.verification_session.requires_input":
    case "identity.verification_session.canceled": {
      const notification = event.data.object;
      const userId = z.uuid().safeParse(notification.metadata?.user_id);
      if (!userId.success) break;
      try {
        const admin = createAdminClient();
        const { data: profile, error } = await admin
          .from("profiles")
          .select("date_of_birth,tier,identity_status,identity_ref")
          .eq("id", userId.data)
          .maybeSingle();
        if (error) throw new Error("Profile lookup failed.");
        // Ignore deleted accounts, unknown/older attempts, and terminal success.
        if (
          !profile ||
          profile.identity_ref !== notification.id ||
          profile.tier !== "basic" ||
          profile.identity_status === "verified"
        )
          break;

        // Read the current Stripe state: webhook delivery can be out of order.
        let session = await getStripe().identity.verificationSessions.retrieve(
          notification.id,
        );
        if (session.livemode || session.metadata?.user_id !== userId.data)
          break;
        if (session.status === "processing") break;
        if (session.status === "verified") {
          // DOB requires its own expansion and a restricted key. Keep all outputs
          // in memory; never log or persist the session payload or document data.
          session =
            await getIdentityResultsStripe().identity.verificationSessions.retrieve(
              session.id,
              {
                expand: ["verified_outputs", "verified_outputs.dob"],
              },
            );
          if (
            session.livemode ||
            session.status !== "verified" ||
            session.metadata?.user_id !== userId.data
          )
            break;
        }

        const passed =
          session.status === "verified" &&
          session.type === "document" &&
          session.options?.document?.require_matching_selfie === true &&
          identityDobMatches(
            profile.date_of_birth,
            session.verified_outputs?.dob,
          );
        const { error: writeError } = await admin
          .from("profiles")
          .update(
            passed
              ? {
                  tier: "verified_guest",
                  identity_status: "verified",
                  identity_ref: session.id,
                  verified_at: new Date().toISOString(),
                }
              : { identity_status: "failed" },
          )
          .eq("id", userId.data)
          .eq("identity_ref", session.id)
          .eq("tier", "basic")
          .neq("identity_status", "verified");
        if (writeError) throw new Error("Verification update failed.");
      } catch {
        // A non-2xx response lets Stripe retry transient DB/API errors. Deliberately
        // return no exception detail: provider errors can contain personal data.
        return Response.json(
          { error: "Could not process verification." },
          { status: 500 },
        );
      }
      break;
    }
  }
  return Response.json({ received: true });
}
