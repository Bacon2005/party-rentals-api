"use server";

import { redirect } from "next/navigation";
import { EmailSchema, VerifyEmailSchema } from "@/lib/definitions";
import { recordSignupConsents } from "@/lib/consents";
import { createClient } from "@/lib/supabase/server";

export type VerifyEmailState = { message: string };

export async function verifyEmail(_prev: VerifyEmailState, form: FormData): Promise<VerifyEmailState> {
  const parsed = VerifyEmailSchema.safeParse({ email: form.get("email"), token: form.get("token") });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "signup" });
  if (error || !data.user?.email_confirmed_at || !data.session) {
    return { message: "Invalid or expired code" };
  }
  try {
    await recordSignupConsents(data.user.id);
  } catch {
    return { message: "Email confirmed. We couldn't save your agreement yet. Reload this page to retry." };
  }
  redirect("/dashboard");
}

export async function resendCode(email: string): Promise<VerifyEmailState> {
  const parsed = EmailSchema.safeParse(email);
  if (!parsed.success) return { message: "Enter a valid email." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data });
  return { message: error
    ? "Couldn't send a code. Wait a minute and try again."
    : "If confirmation is needed, a new code has been sent. Check your inbox and spam folder." };
}
