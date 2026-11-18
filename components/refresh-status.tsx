"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function RefreshStatus() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className="text-sm underline disabled:opacity-50" onClick={() => start(() => router.refresh())}>{pending ? "Refreshing…" : "Refresh status"}</button>;
}
