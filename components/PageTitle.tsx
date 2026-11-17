"use client";

import { usePathname } from "next/navigation";

// Add your routes here. Nested routes (e.g. /events/123) match their closest prefix.
const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/events": "Events",
  "/analytics": "Analytics",
  "/bookings": "Bookings",
  "/profile": "Profile",
  "/settings": "Settings",
};

function getTitle(pathname: string) {
  // Longest matching prefix wins, so "/events/new" can have its own entry
  const match = Object.keys(titles)
    .filter((route) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b.length - a.length)[0];

  return match ? titles[match] : "";
}

export function PageTitle() {
  const pathname = usePathname();
  return (
    <h1 className="text-4xl font-bold text-foreground">{getTitle(pathname)}</h1>
  );
}
