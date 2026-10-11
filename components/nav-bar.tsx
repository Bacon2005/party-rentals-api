"use client";
import Image from "next/image";
import { Home, Calendar, ChartNoAxesColumn } from "lucide-react";
import NavLink from "@/components/nav-link";
import Logo from "@/components/assets/images/Logo-Name.png";

export default function NavBar() {
  return (
    <div className="sticky top-6 flex flex-col items-center gap-8 bg-surface px-4 py-6 min-w-24 shrink-0 bg-dashboard">
      {/* Profile picture */}
      <div className=" overflow-hidden">
        <Image
          src={Logo}
          alt="Party Link Logo"
          width={200}
          height={200}
          className="transition-transform duration-300"
        />
      </div>

      {/* Nav items */}
      <ul className="flex flex-col gap-10 items-left">
        <NavLink href="/dashboard" text="Dashboard">
          <Home size={30} />
        </NavLink>
        <NavLink href="" text="Events">
          <Calendar size={30} />
        </NavLink>
        <NavLink href="" text="Bookings">
          <Calendar size={30} />
        </NavLink>
        <NavLink href="" text="Analytics">
          <ChartNoAxesColumn size={30} />
        </NavLink>
      </ul>

      <hr className="w-8 border-outline" />

      {/* Diamond placeholder — theme toggle to be designed later */}
      <div className="w-8 h-8 rotate-45 bg-dashboard-text rounded-md" />
    </div>
  );
}
