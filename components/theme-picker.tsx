"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronUp, Moon, Sun, SunMoon } from "lucide-react";

export function ThemePicker({ collapsed }: { collapsed: boolean }) {
  const popoverId = useId();
  const popover = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState("light");
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, bottom: 80 });

  function chooseTheme(value: "light" | "dark") {
    document.documentElement.dataset.theme = value;
    setTheme(value);
    try {
      localStorage.setItem("partylink-theme", value);
    } catch {
      // Apply the theme even when browser storage is unavailable.
    }
    popover.current?.hidePopover();
    trigger.current?.focus();
  }

  return (
    <div className="mt-auto border-t border-white/20 pt-4">
      <button
        ref={trigger}
        type="button"
        title={collapsed ? "Theme" : undefined}
        aria-label="Choose light or dark theme"
        aria-expanded={open}
        aria-controls={popoverId}
        popoverTarget={popoverId}
        onClick={() => {
          setTheme(document.documentElement.dataset.theme ?? "light");
          const bounds = trigger.current?.getBoundingClientRect();
          if (bounds) {
            setPosition({ left: bounds.left, bottom: window.innerHeight - bounds.top + 8 });
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        <SunMoon className="size-5 shrink-0" />
        <span className={collapsed ? "sr-only" : "whitespace-nowrap"}>Theme</span>
        {!collapsed && <ChevronUp className={`ml-auto size-4 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {/* The native popover stays above the sidebar's overflow, even when collapsed. */}
      <div
        ref={popover}
        id={popoverId}
        popover="auto"
        role="group"
        aria-label="Theme"
        onToggle={(event) => setOpen(event.newState === "open")}
        style={{ left: position.left, bottom: position.bottom, top: "auto", right: "auto" }}
        className="fixed m-0 w-40 max-w-[calc(100vw-2rem)] rounded-xl border border-border-color bg-background p-1.5 text-dashboard shadow-lg"
      >
        {([
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => chooseTheme(value)}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-violet-400 ${theme === value ? "bg-violet-500/10" : "hover:bg-slate-100"}`}
          >
            <Icon className="size-4" />
            {label}
            {theme === value && <Check className="ml-auto size-4 text-violet-500" />}
          </button>
        ))}
      </div>
    </div>
  );
}