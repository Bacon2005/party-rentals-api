import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/nav-bar";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Party Link",
};

async function AuthNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth
    .getClaims()
    .catch(() => ({ data: null }));
  return data?.claims ? <NavBar /> : null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-screen flex flex-row gap-6 bg-background p-6">
        {/* Navigation Bar */}
        <Suspense fallback={null}>
          <AuthNav />
        </Suspense>
        <div className="flex-1 min-w-0">{children}</div>
      </body>
    </html>
  );
}
