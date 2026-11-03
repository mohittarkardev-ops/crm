"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

const KEY = "crm-welcome";
const HOLD_MS = 3400; // time on screen before the dissolve starts
const FADE_MS = 700; // dissolve into the CRM

type Phase = "intro" | "exit" | "done";

function readSeen() {
  if (new URLSearchParams(window.location.search).has("welcome")) return false; // preview: open /?welcome
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * Welcome splash: colour washes spread across the screen, the staff member is greeted by name,
 * then the screen dissolves into the CRM. Shown once per browser session (a new tab, or after sign-in).
 * Click or press any key to skip.
 */
export function WelcomeSplash({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const decided = useRef(false);

  // Before paint: decide whether this session still needs the splash and sync the CSS flag.
  useLayoutEffect(() => {
    if (decided.current) return; // React Strict Mode runs effects twice in development
    decided.current = true;
    if (readSeen()) {
      document.documentElement.dataset.welcome = "seen";
      setPhase("done");
      return;
    }
    document.documentElement.dataset.welcome = "show";
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode: the splash simply shows again next time */
    }
  }, []);

  useEffect(() => {
    if (phase !== "intro") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPhase("exit"), reduced ? 1200 : HOLD_MS);
    const skip = () => setPhase("exit");
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(() => setPhase("done"), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setPhase("exit")}
      className={cn(
        "welcome-splash fixed inset-0 z-[200] cursor-pointer overflow-hidden bg-[var(--bg-from)] transition-opacity ease-out",
        phase === "exit" && "pointer-events-none opacity-0",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="welcome-wash welcome-wash-1" />
      <div className="welcome-wash welcome-wash-2" />
      <div className="welcome-wash welcome-wash-3" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          className="welcome-item grid size-16 place-items-center rounded-[10px] bg-ink text-white shadow-card"
          style={{ animationDelay: "400ms" }}
        >
          <ShieldCheck size={30} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p
          className="welcome-item text-sm font-medium uppercase tracking-[0.2em] text-ink/70"
          style={{ animationDelay: "900ms" }}
        >
          Welcome back
        </p>
        <h1
          className="welcome-item break-words text-4xl font-bold leading-tight text-ink sm:text-5xl"
          style={{ animationDelay: "1100ms" }}
        >
          {name}
        </h1>
        <p className="welcome-item text-sm text-ink/70" style={{ animationDelay: "1600ms" }}>
          The Future is in Good Hands
        </p>
        <p className="welcome-item mt-6 text-[11px] text-ink/50" style={{ animationDelay: "2200ms" }}>
          Developed with love in India.
        </p>
      </div>
    </div>
  );
}

/** Rendered on the login page: signing out or in always earns a fresh welcome. */
export function ResetWelcome() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
