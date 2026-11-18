"use client";

import { useActionState } from "react";
import { becomeHost } from "./actions";

export function HostAgreementForm() {
  const [state, action, pending] = useActionState(becomeHost, { message: "" });
  return <form action={action} className="flex flex-col gap-4">
    <label className="flex items-start gap-2">
      <input type="checkbox" name="agree" required className="mt-1" />
      <span>I agree to the host agreement (version 2026-01).</span>
    </label>
    {state.message && <p role="alert" className="text-red-700">{state.message}</p>}
    <button disabled={pending} className="rounded-lg bg-form-button px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Saving agreement…" : "Become a host"}
    </button>
  </form>;
}
