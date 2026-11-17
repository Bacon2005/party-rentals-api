import { Suspense } from "react";
import { Bell } from "lucide-react";
import { connection } from "next/server";
import { verifyUser } from "@/lib/auth";
import { TopBarSkeleton } from "@/components/Skeletons";
import { UserDropdown } from "@/components/UserDropdown";
import { PageTitle } from "./PageTitle";

async function UserMenu() {
  await connection();

  const profile = await verifyUser();
  const name = profile.hostName || profile.name;
  const role = profile.role ?? "User";

  return <UserDropdown name={name} role={role} avatarUrl={profile.avatarUrl} />;
}

export function Header() {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4">
      <Suspense fallback={<div className="h-7 w-32" />}>
        <PageTitle />
      </Suspense>

      <div className="flex items-center gap-6">
        {/* date range picker goes here later */}
        <button aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500" />
        </button>
        <Suspense fallback={<TopBarSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
