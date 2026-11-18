import { AuthCard } from "./auth-card";
import Logo from "@/components/assets/images/Logo-Name.png";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

async function RedirectIfLoggedIn() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return null;
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid h-dvh place-items-center overflow-hidden p-4">
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>
      {/* background blobs: clipped by <main>, behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#FFFBC2] blur-[110px]" />
        <div className="absolute -top-40 left-1/4 h-80 w-lg rounded-full bg-[#EBD3FB] blur-[110px]" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-136 rounded-full bg-[#9DFBFF] blur-[110px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#EBD3FB] blur-[110px]" />
      </div>

      <div className="flex flex-row items-center justify-center gap-10 px-16 py-8">
        <Image src={Logo} alt="" width={500} height={500} loading="eager" />
        <AuthCard />
        {/* pages render nothing; they exist so the routes (and URL) exist */}
        {children}
      </div>
    </main>
  );
}
