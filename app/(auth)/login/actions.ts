"use server";

import { redirect } from "next/navigation";
import { CredentialsSchema } from "@/lib/definitions";
import { createClient } from "@/lib/supabase/server";
import { recordSignupConsents } from "@/lib/consents";

export type LoginState = { message: string; email: string };

export async function authenticate(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const parsed = CredentialsSchema.safeParse({
    email,
    password: form.get("password"),
  });
  if (!parsed.success)
    return { message: parsed.error.issues[0].message, email };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error?.code === "email_not_confirmed" || error?.message.toLowerCase().includes("email not confirmed")) {
    await supabase.auth.resend({ type: "signup", email: parsed.data.email });
    redirect("/verify-email?email=" + encodeURIComponent(parsed.data.email));
  }
  if (error) return { message: error.message, email };
  if (!data.user?.email_confirmed_at) return { message: "Confirm your email to continue.", email };
  try { await recordSignupConsents(data.user.id); }
  catch { return { message: "Couldn't save your agreement. Please log in again to retry.", email }; }
  redirect("/dashboard");
}
