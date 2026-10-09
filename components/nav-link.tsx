"use client";
// This must be a Client Component because we're using the usePathname hook,
// which reads browser/router state and only works on the client.

import Link from "next/link";
// Next.js's own Link component — enables client-side navigation
// (no full page reload) instead of a plain <a> tag.

import { usePathname } from "next/navigation";
// Hook that returns the current URL path (e.g. "/about"),
// so we can figure out which nav item is "active".

export default function NavLink({
  href,
  text,
  children,
}: {
  href: string; // the route this link points to, e.g. "/about"
  text: string | null;
  children: React.ReactNode; // whatever text/elements are passed between <NavLink> tags
}) {
  const pathname = usePathname();
  // Gets the current page's path from the browser's URL.
  const isActive = pathname === href;
  // true if this link's href matches the current page —
  // used to keep the underline visible on the active page.

  return (
    <li className="relative font-bold w-fit list-none">
      <Link
        href={href}
        className={`flex flex-row gap-4 items-center relative
                  after:content-[''] after:absolute after:left-1/2 after:-bottom-1
                  after:h-0.5 after:w-full after:bg-current
                  after:origin-center after:transition-transform after:duration-300
                  after:-translate-x-1/2
                  hover:after:scale-x-100
                  ${isActive ? "after:scale-x-100" : "after:scale-x-0"}`}
      >
        {children}
        {text}
      </Link>
    </li>
  );
}
