"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LoginForm } from "./login/login-form";
import { SignUpForm } from "./sign-up/sign-up-form";

function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, height] as const;
}

export function AuthCard() {
  const pathname = usePathname();
  const isSignUp = pathname.startsWith("/sign-up");

  const [loginRef, loginH] = useHeight<HTMLDivElement>();
  const [signUpRef, signUpH] = useHeight<HTMLDivElement>();
  const height = isSignUp ? signUpH : loginH;

  return (
    // static card: padding lives here and never changes
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/10">
      {/* animated wrapper: no padding, only its height changes */}
      <div
        style={{ height }}
        className="grid overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
      >
        <Panel panelRef={loginRef} active={!isSignUp}>
          <LoginForm />
        </Panel>
        <Panel panelRef={signUpRef} active={isSignUp}>
          <SignUpForm />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  panelRef,
  active,
  children,
}: {
  panelRef: React.Ref<HTMLDivElement>;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      inert={!active}
      aria-hidden={!active}
      style={{ transitionDelay: active ? "150ms" : "0ms" }}
      className={`col-start-1 row-start-1 self-start transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
