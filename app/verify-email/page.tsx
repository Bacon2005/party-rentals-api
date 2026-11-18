import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { EmailSchema } from "@/lib/definitions";
import { createClient } from "@/lib/supabase/server";
import { recordSignupConsents } from "@/lib/consents";
import { VerificationCard } from "@/components/verification-card";
import { VerifyEmailForm } from "./verify-email-form";

async function Content({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  await connection();
  const parsed = EmailSchema.safeParse((await searchParams).email);
  if (!parsed.success) return <p>Start at <Link href="/sign-up" className="underline">sign up</Link> or <Link href="/login" className="underline">log in</Link> to receive a code.</p>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email_confirmed_at && user.email?.toLowerCase() === parsed.data.toLowerCase()) {
    try { await recordSignupConsents(user.id); }
    catch { return <p role="alert">Couldn't save your agreement. Please reload to retry.</p>; }
    redirect("/dashboard");
  }
  return <>
    <h1 className="text-3xl font-bold">Verify your email</h1>
    <p className="break-words text-neutral-500">Enter the code sent to {parsed.data}.</p>
    <VerifyEmailForm email={parsed.data} />
    <Link href="/login" className="block text-sm underline">Back to login</Link>
  </>;
}

export default function Page(props: { searchParams: Promise<{ email?: string }> }) {
  return <VerificationCard><Suspense fallback={<p>Loading…</p>}><Content {...props} /></Suspense></VerificationCard>;
}
