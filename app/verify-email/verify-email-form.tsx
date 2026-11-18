"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { resendCode, verifyEmail } from "./actions";

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyEmail, { message: "" });
  const [seconds, setSeconds] = useState(60);
  const [resendMessage, setResendMessage] = useState("");
  const [resending, startResend] = useTransition();

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={email} />
        <label htmlFor="token" className="font-bold">
          6-digit email code
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          minLength={6}
          required
          placeholder="123456"
          className="border px-4 py-2 tracking-widest"
        />
        {state.message && (
          <p role="alert" className="text-red-700">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || resending}
          className="rounded-lg bg-form-button px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Checking code…" : "Verify email"}
        </button>
      </form>
      <button
        type="button"
        disabled={seconds > 0 || resending || pending}
        className="w-full rounded-lg border px-4 py-2 disabled:opacity-50"
        onClick={() =>
          startResend(async () => {
            setSeconds(60);
            try {
              setResendMessage((await resendCode(email)).message);
            } catch {
              setResendMessage("Couldn't send a code. Please try again.");
            }
          })
        }
      >
        {resending
          ? "Sending…"
          : seconds > 0
            ? `Resend code in ${seconds}s`
            : "Resend code"}
      </button>
      <p role="status" className="text-sm text-neutral-500">
        {resendMessage}
      </p>
    </div>
  );
}
