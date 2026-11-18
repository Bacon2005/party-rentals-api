"use server";

import { redirect } from "next/navigation";
import { SignUpSchema } from "@/lib/definitions";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_VERSION } from "@/lib/consents";

export type SignupState = { message: string; name: string; email: string; dateOfBirth: string };

export async function signUp(
  _prev: SignupState,
  form: FormData,
): Promise<SignupState> {
  //Get the name and email from the form. If they are not present default empty
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const dateOfBirth = String(form.get("dateOfBirth") ?? "");
  const parsed = SignUpSchema.safeParse({
    name,
    email,
    dateOfBirth,
    acceptTerms: form.get("acceptTerms"),
    password: String(form.get("password") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  });
  if (!parsed.success)
    return { message: parsed.error.issues[0].message, name, email, dateOfBirth };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: {
      name: parsed.data.name,
      date_of_birth: parsed.data.dateOfBirth,
      accept_terms: true,
      consent_version: LEGAL_VERSION,
    } },
  });

  if (error) return { message: error.message, name, email, dateOfBirth };
  if (data.session) {
    await supabase.auth.signOut();
    return { message: "Email confirmation must be enabled before signing up.", name, email, dateOfBirth };
  }
  redirect("/verify-email?email=" + encodeURIComponent(parsed.data.email));
}

export async function goToLogin() {
  redirect("/login");
}
