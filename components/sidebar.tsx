"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import GroupName from "@/components/assets/images/Name.png";
import { signOut } from "@/app/(app)/actions";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // labels stay in the DOM for screen readers, just visually hidden when collapsed
  const label = (text: string) => (
    <span
      className={`whitespace-nowrap transition-opacity duration-200 ${
        collapsed ? "opacity-0" : "opacity-100"
      }`}
    >
      {text}
    </span>
  );

  return (
    <aside
      className={`flex shrink-0 flex-col overflow-hidden bg-[#070720] px-3 py-6 transition-[width] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "w-18" : "w-60"
      }`}
    >
      {/* top row: Name + toggle */}
      <div
        className={`mb-8 flex items-center ${
          collapsed ? "justify-center" : "justify-between pl-1"
        }`}
      >
        {!collapsed && (
          <Link
            href="/dashboard"
            tabIndex={collapsed ? -1 : 0}
            aria-hidden={collapsed}
            className={`transition-opacity duration-200 ${
              collapsed ? "pointer-events-none w-0 opacity-0" : "opacity-100"
            }`}
          >
            <Image
              src={GroupName}
              alt="PartyLink"
              className="h-auto w-32"
              priority
            />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          aria-expanded={!collapsed}
          className="grid size-9 place-items-center rounded-lg text-neutral-400 hover:cursor-pointer hover:bg-white/5 hover:text-white"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map(({ href, label: text, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? text : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-600 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-5 shrink-0" />
              {label(text)}
            </Link>
          );
        })}
      </nav>

      <form action={signOut} className="mt-auto border-t border-white/20 pt-4">
        <button
          title={collapsed ? "Log Out" : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:cursor-pointer hover:text-red-400"
        >
          <LogOut className="size-5 shrink-0" />
          {label("Log Out")}
        </button>
      </form>
    </aside>
  );
}
