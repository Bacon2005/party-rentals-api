import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { connection } from "next/server";

async function RequireUser() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Suspense fallback={null}>
        <RequireUser />
      </Suspense>

      <Sidebar />

      {/* min-w-0 lets wide tables shrink instead of pushing the page sideways */}
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <Header />
        {/* only this area scrolls; the sidebar and header stay put */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
