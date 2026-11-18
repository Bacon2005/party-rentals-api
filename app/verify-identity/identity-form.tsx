"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startIdentityVerification } from "./actions";

export function RefreshIdentityStatus() {
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  return <button type="button" disabled={pending} className="block text-sm underline disabled:opacity-50"
    onClick={() => startRefresh(() => router.refresh())}>{pending ? "Refreshing…" : "Refresh status"}</button>;
}

export function IdentityForm({ status }: { status: string }) {
  const [state, action, pending] = useActionState(startIdentityVerification, { message: "" });
  return <form action={action} className="flex flex-col gap-4">
    <p className="text-sm text-neutral-500">Stripe processes a government ID and a selfie, including biometric information, to confirm your identity and age. Party Link stores only the result, session reference and timestamp alongside your signup details.</p>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name="acceptBiometrics" required className="mt-1" />
      <span>I understand and agree to Stripe processing my ID and selfie for this verification.</span>
    </label>
    {state.message && <p role="alert" className="text-red-700">{state.message}</p>}
    <button disabled={pending} className="rounded-lg bg-form-button px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Opening Stripe…" : status === "failed" ? "Retry identity verification" : status === "pending" ? "Continue verification" : "Verify my identity"}
    </button>
  </form>;
}
