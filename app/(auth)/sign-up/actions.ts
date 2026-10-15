"use server";

import { redirect } from "next/navigation";
import { SignUpSchema } from "@/lib/definitions";
import { createClient } from "@/lib/supabase/server";

export type SignupState = { message: string; name: string; email: string };

export async function signUp(
  _prev: SignupState,
  form: FormData,
): Promise<SignupState> {
  //Get the name and email from the form. If they are not present default empty
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const parsed = SignUpSchema.safeParse({
    name,
    email,
    password: String(form.get("password") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  });
  if (!parsed.success)
    return { message: parsed.error.issues[0].message, name, email };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });

  if (error) return { message: error.message, name, email };
  redirect("/dashboard");
}

export async function goToLogin() {
  redirect("/login");
}
