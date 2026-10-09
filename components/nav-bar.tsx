"use client";
import Image from "next/image";
import { Home, Calendar, Gpu, Mail } from "lucide-react";
import NavLink from "@/components/nav-link";
import Logo from "@/components/assets/images/Logo.png";

export default function NavBar() {
  return (
    <div className="sticky top-6 flex flex-col items-center gap-8 bg-surface rounded-3xl px-4 py-6 min-w-24 shrink-0">
      {/* Profile picture */}
      <div className="rounded-full overflow-hidden ring-2 ring-outline">
        <Image
          src={Logo}
          alt="Party Link Logo"
          width={50}
          height={50}
          className="transition-transform duration-300 ease-in-out hover:scale-110"
        />
      </div>

      <hr className="w-8 border-outline" />

      {/* Nav items — using your existing NavLink, just placeholder squares as children for now */}
      <ul className="flex flex-col gap-10 items-left">
        <NavLink href="" text="Dashboard">
          <Home size={30} />
        </NavLink>
        <NavLink href="" text="Events">
          <Calendar size={30} />
        </NavLink>
        <NavLink href="" text="Bookings">
          <Calendar size={30} />
        </NavLink>
        <NavLink href="" text="Analytics">
          <Mail size={30} />
        </NavLink>
      </ul>

      <hr className="w-8 border-outline" />

      {/* Diamond placeholder — theme toggle to be designed later */}
      <div className="w-8 h-8 rotate-45 bg-surface-2 rounded-md" />
    </div>
  );
}
