import { Suspense } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

async function UserMenu() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = user?.user_metadata?.name ?? user?.email ?? "";

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-full bg-violet-100 font-semibold text-violet-700">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="text-sm leading-tight">
        <p className="font-semibold">{name}</p>
        <p className="text-neutral-500">Host</p>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-end gap-6 px-6 py-4">
      {/* date range picker goes here later */}
      <button aria-label="Notifications" className="relative">
        <Bell className="size-5" />
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500" />
      </button>
      <Suspense fallback={<div className="h-10 w-40" />}>
        <UserMenu />
      </Suspense>
    </header>
  );
}
