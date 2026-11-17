"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { signOut } from "@/app/(app)/actions";

type Props = {
  name: string;
  role: string;
  avatarUrl?: string | null;
};

export function UserDropdown({ name, role, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-lg p-1 pr-2 hover:bg-neutral-100"
      >
        <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-violet-100 font-semibold text-violet-700">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              quality={90}
              className="size-10 object-cover"
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="text-left text-sm leading-tight">
          <p className="font-semibold">{name}</p>
          <p className="text-neutral-500">{role}</p>
        </div>
        <ChevronDown
          className={`size-4 text-neutral-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg"
        >
          <Link
            href="/profile"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <User className="size-4" />
            Profile
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            className={itemClass}
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4" />
            Settings
          </Link>
          <div className="my-1 h-px bg-neutral-200" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
