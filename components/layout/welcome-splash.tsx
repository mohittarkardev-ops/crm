"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SplashWelcomeCharacter, getShiftForHour, type MascotShift } from "@/components/ui/characters";
import { cn } from "@/lib/cn";

const KEY = "crm-welcome";
const HOLD_MS = 3600; // time on screen before the dissolve starts
const FADE_MS = 700; // dissolve into the CRM

type Phase = "intro" | "exit" | "done";

function resolveWelcomeMeta(): { seen: boolean; shift: MascotShift; greeting: string } {
  const params = new URLSearchParams(window.location.search);
  const previewParam = params.get("welcome")?.toLowerCase();
  const hour = new Date().getHours();
  const shift: MascotShift =
    previewParam === "morning" || previewParam === "midday" || previewParam === "evening"
      ? previewParam
      : getShiftForHour(hour);

  const greeting =
    shift === "morning"
      ? "Good morning"
      : shift === "midday"
        ? hour < 12 && previewParam !== "midday"
          ? "Good morning"
          : hour >= 17 && previewParam !== "midday"
            ? "Good evening"
            : "Good afternoon"
        : "Good evening";

  if (params.has("welcome")) return { seen: false, shift, greeting }; // preview: open /?welcome or /?welcome=morning|midday|evening
  try {
    return { seen: sessionStorage.getItem(KEY) === "1", shift, greeting };
  } catch {
    return { seen: true, shift, greeting };
  }
}

/**
 * Welcome splash: colour washes spread across the screen, Door-Opening Pip welcomes the staff
 * member by name for their current shift, then the screen dissolves into the CRM.
 * Shown once per browser session (a new tab, or after sign-in). Click or press any key to skip.
 */
export function WelcomeSplash({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [shift, setShift] = useState<MascotShift>("midday");
  const [greeting, setGreeting] = useState("Welcome back");
  const decided = useRef(false);

  // Before paint: decide whether this session still needs the splash and sync shift flair cleanly.
  useLayoutEffect(() => {
    if (decided.current) return; // React Strict Mode runs effects twice in development
    decided.current = true;
    const meta = resolveWelcomeMeta();
    setShift(meta.shift);
    setGreeting(meta.greeting);
    if (meta.seen) {
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

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="welcome-item" style={{ animationDelay: "320ms" }}>
          <SplashWelcomeCharacter shift={shift} />
        </div>
        <p
          className="welcome-item text-sm font-medium uppercase tracking-[0.2em] text-ink/70"
          style={{ animationDelay: "900ms" }}
        >
          {greeting}
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
        <p className="welcome-item mt-5 text-[11px] text-ink/50" style={{ animationDelay: "2200ms" }}>
          Developed with love in India · Click anywhere to continue
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
