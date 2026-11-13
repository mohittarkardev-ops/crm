"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SplashWelcomeCharacter, getShiftForHour, type MascotShift } from "@/components/ui/characters";
import { getWelcomeBriefing, type BriefingItem } from "@/lib/actions/briefing";
import { cn } from "@/lib/cn";
import "./welcome-splash.css";

const KEY = "crm-welcome";
const HOLD_MS = 5000; // time on screen before the circle reveal starts
const REVEAL_MS = 850; // the circle opening into the CRM

// When each step of the entrance begins (ms after the splash appears).
const PIP_AT = 920;
const TEXT_AT = 1850;
const BRIEF_AT = 2650;

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

const FLOATERS = [
  { left: "8%", size: 26, delay: "0s", dur: "11s", kind: "shield" },
  { left: "22%", size: 20, delay: "2.2s", dur: "13s", kind: "slip" },
  { left: "37%", size: 16, delay: "5s", dur: "10s", kind: "shield" },
  { left: "63%", size: 22, delay: "1.1s", dur: "12s", kind: "slip" },
  { left: "78%", size: 28, delay: "3.4s", dur: "14s", kind: "shield" },
  { left: "91%", size: 18, delay: "6.2s", dur: "11s", kind: "slip" },
] as const;

const TWINKLES = [
  { left: "12%", top: "16%", delay: "0s" },
  { left: "30%", top: "8%", delay: "1.1s" },
  { left: "58%", top: "14%", delay: "2s" },
  { left: "74%", top: "26%", delay: "0.6s" },
  { left: "88%", top: "10%", delay: "1.7s" },
  { left: "20%", top: "34%", delay: "2.4s" },
] as const;

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 44 46" className="size-full" aria-hidden="true">
      <path
        d="M22 6 C30 6 36 9.5 36 13.5 V26 C36 34.5 22 40 22 40 C22 40 8 34.5 8 26 V13.5 C8 9.5 14 6 22 6 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 10.8 C17 9.4 19.5 8.8 22 8.8 C24.5 8.8 27 9.4 29.5 10.8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SlipGlyph() {
  return (
    <svg viewBox="0 0 32 40" className="size-full" aria-hidden="true">
      <rect x="3" y="3" width="26" height="34" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.2" />
      <rect x="8" y="9" width="11" height="4.5" rx="1.5" fill="var(--accent)" />
      <line x1="8" y1="20" x2="24" y2="20" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="8" y1="27" x2="19" y2="27" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** The time-of-day backdrop: tinted washes, a morning sun, evening twinkles, and slowly drifting shields and slips. */
function SplashScene({ shift }: { shift: MascotShift }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className={cn("sp-sky", `sp-sky-${shift}`)} />
      {shift === "morning" && <div className="sp-sun" />}
      {shift === "evening" &&
        TWINKLES.map((t, i) => (
          <span
            key={i}
            className="sp-twinkle size-1.5 rounded-full bg-[var(--accent)]"
            style={{ left: t.left, top: t.top, animationDelay: t.delay }}
          />
        ))}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className="sp-float"
          style={{ left: f.left, width: f.size, height: f.size, animationDelay: f.delay, animationDuration: f.dur }}
        >
          {f.kind === "shield" ? <ShieldGlyph /> : <SlipGlyph />}
        </span>
      ))}
    </div>
  );
}

/** The SecureDrive shield, drawn line by line before Pip arrives. */
function Crest({ out }: { out: boolean }) {
  return (
    <svg viewBox="0 0 44 46" className={cn("sp-crest size-24", out && "sp-crest-out")} aria-hidden="true">
      <path
        className="sp-crest-body"
        pathLength={1}
        d="M22 6 C30 6 36 9.5 36 13.5 V26 C36 34.5 22 40 22 40 C22 40 8 34.5 8 26 V13.5 C8 9.5 14 6 22 6 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        className="sp-crest-arc"
        pathLength={1}
        d="M14.5 10.8 C17 9.4 19.5 8.8 22 8.8 C24.5 8.8 27 9.4 29.5 10.8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Welcome splash, in order: the shield crest draws itself, Pip steps out of the door (matching the time of day),
 * the greeting and the person's name arrive word by word, then a one-line briefing of what is waiting for them.
 * The screen then opens like a circle from Pip's doorway into the CRM.
 * Shown once per browser session (a new tab, or after sign-in). Click or press any key to skip.
 */
export function WelcomeSplash({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [showing, setShowing] = useState(false);
  const [stage, setStage] = useState(0);
  const [shift, setShift] = useState<MascotShift>("midday");
  const [greeting, setGreeting] = useState("Welcome back");
  const [briefing, setBriefing] = useState<BriefingItem[] | null>(null);
  const decided = useRef(false);
  const exiting = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);

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
    setShowing(true);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode: the splash simply shows again next time */
    }
  }, []);

  // Start the circle reveal from Pip's doorway.
  const startExit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    const rect = pipRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height * 0.55 : window.innerHeight / 2;
    rootRef.current?.style.setProperty("--sp-x", `${x}px`);
    rootRef.current?.style.setProperty("--sp-y", `${y}px`);
    setPhase("exit");
  }, []);

  // The entrance steps, the automatic continue, and skipping with any key.
  useEffect(() => {
    if (!showing || phase !== "intro") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    if (reduced) {
      setStage(3);
    } else {
      timers.push(window.setTimeout(() => setStage(1), PIP_AT));
      timers.push(window.setTimeout(() => setStage(2), TEXT_AT));
      timers.push(window.setTimeout(() => setStage(3), BRIEF_AT));
    }
    timers.push(window.setTimeout(startExit, reduced ? 1800 : HOLD_MS));
    window.addEventListener("keydown", startExit);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("keydown", startExit);
    };
  }, [showing, phase, startExit]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = window.setTimeout(() => setPhase("done"), REVEAL_MS + 100);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // What is waiting for this person today (only fetched when the splash actually shows).
  useEffect(() => {
    if (!showing) return;
    let cancelled = false;
    getWelcomeBriefing()
      .then((result) => {
        if (!cancelled && result.ok) setBriefing(result.items);
      })
      .catch(() => {
        /* no briefing line, the splash carries on */
      });
    return () => {
      cancelled = true;
    };
  }, [showing]);

  if (phase === "done") return null;

  const words = name.trim().split(/\s+/).filter(Boolean);
  const wordsDone = 150 + words.length * 90 + 560; // when the last word has settled

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      onClick={startExit}
      className={cn(
        "welcome-splash sp-root fixed inset-0 z-[200] cursor-pointer overflow-hidden bg-[var(--bg-from)]",
        phase === "exit" && "sp-exit pointer-events-none",
      )}
    >
      <SplashScene shift={shift} />

      <div className="sp-content relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div ref={pipRef} className="relative grid h-40 w-52 place-items-center">
          <Crest out={stage >= 1} />
          {stage >= 1 && (
            <div className="sp-pip-in">
              <SplashWelcomeCharacter shift={shift} />
            </div>
          )}
        </div>

        <div className="flex min-h-[8.5rem] flex-col items-center gap-3">
          {stage >= 2 && (
            <>
              <p className="sp-fade-up text-sm font-medium uppercase tracking-[0.2em] text-ink/70">{greeting}</p>
              <h1 className="flex flex-wrap justify-center gap-x-3 text-4xl font-bold leading-tight text-ink sm:text-5xl">
                {words.map((word, index) => (
                  <span key={`${word}-${index}`} className="sp-mask">
                    <span className="sp-word" style={{ animationDelay: `${150 + index * 90}ms` }}>
                      {word}
                    </span>
                  </span>
                ))}
              </h1>
              <span className="sp-underline" style={{ animationDelay: `${wordsDone - 200}ms` }} />
              <p className="sp-fade-up text-sm text-ink/70" style={{ animationDelay: `${wordsDone}ms` }}>
                The Future is in Good Hands
              </p>
            </>
          )}
        </div>

        <div className="min-h-[1.75rem] text-sm text-ink/80">
          {stage >= 3 && briefing && briefing.length > 0 && (
            <p className="sp-fade-up flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              {briefing.map((entry, index) => (
                <span key={entry.key} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true">·</span>}
                  <span>
                    <b className="font-semibold tabular-nums text-ink">{entry.count}</b> {entry.label}
                  </span>
                </span>
              ))}
            </p>
          )}
          {stage >= 3 && briefing && briefing.length === 0 && (
            <p className="sp-fade-up">You are all caught up for today.</p>
          )}
        </div>
      </div>

      <div className="sp-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-6 text-center">
        <p className="text-xs text-ink/60">
          {briefing !== null || stage >= 3 ? "Opening your workspace" : "Preparing your day"}
          <span aria-hidden="true"> · click anywhere to skip</span>
        </p>
        <p className="mt-1 text-[11px] text-ink/45">Developed with love in India</p>
      </div>
      <div className="sp-countdown" style={{ animationDuration: `${HOLD_MS}ms` }} aria-hidden="true" />
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
