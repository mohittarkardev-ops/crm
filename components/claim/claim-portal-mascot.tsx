"use client";

import React, { useState } from "react";
import { cn } from "@/lib/cn";

export type ClaimMascotMood =
  | "vault"
  | "scout"
  | "searching"
  | "known_found"
  | "unknown_guide"
  | "claimed_warn"
  | "upload_doc"
  | "ready"
  | "success";

export function ClaimPortalMascot({
  mood = "scout",
  className,
}: {
  mood?: ClaimMascotMood;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 90"
      className={cn("h-16 w-20 shrink-0 select-none", className)}
      role="img"
      aria-label={`Pip the claim mascot in ${mood} state`}
    >
      {/* Soft floor shadow */}
      <ellipse cx="50" cy="82" rx="36" ry="5.5" fill="var(--surface-muted)" />

      {/* Backdrop glow circle */}
      <circle
        cx="50"
        cy="42"
        r="32"
        fill={
          mood === "claimed_warn"
            ? "var(--negative-soft, #fdeded)"
            : mood === "known_found" || mood === "success"
              ? "var(--positive-soft, #edf7ee)"
              : "var(--accent-soft)"
        }
      />

      {/* Main Shield Body of Pip */}
      <g>
        <path
          d="M50 14 C66 14 78 20 78 28 V56 C78 72 50 80 50 80 C50 80 22 72 22 56 V28 C22 20 34 14 50 14 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Yellow Shield Crest Brow */}
        <path
          d="M36 21 C41 18.5 45.5 17.5 50 17.5 C54.5 17.5 59 18.5 64 21"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Cheeks */}
        <circle cx="34" cy="49" r="3.5" fill="var(--accent-soft)" />
        <circle cx="66" cy="49" r="3.5" fill="var(--accent-soft)" />

        {/* Eyebrows */}
        {mood === "claimed_warn" ? (
          <>
            <path d="M37 32 Q42 35 46 33" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
            <path d="M54 33 Q58 35 63 32" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === "known_found" || mood === "success" ? (
          <>
            <path d="M37 31 Q42 27 46 30" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
            <path d="M54 30 Q58 27 63 31" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M37 33 Q42 30 46 32" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M54 32 Q58 30 63 33" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}

        {/* Eyes */}
        {mood === "success" ? (
          // Happy smiling arc eyes
          <>
            <path d="M38 41 Q42 36 46 41" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M54 41 Q58 36 62 41" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
          </>
        ) : (
          // Expressive eyes with shine
          <>
            <ellipse cx="42" cy="41" rx="3.2" ry="4.2" fill="var(--text)" />
            <circle cx="43.2" cy="39.5" r="1.2" fill="var(--surface-strong)" />
            <ellipse cx="58" cy="41" rx="3.2" ry="4.2" fill="var(--text)" />
            <circle cx="59.2" cy="39.5" r="1.2" fill="var(--surface-strong)" />
          </>
        )}

        {/* Mouth */}
        {mood === "claimed_warn" ? (
          <ellipse cx="50" cy="53" rx="3" ry="4" fill="var(--text)" />
        ) : mood === "known_found" || mood === "success" ? (
          <path
            d="M44 50 Q50 58 56 50"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M45 51 Q50 55 55 51"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Mood Props & Accents */}
      {mood === "scout" || mood === "searching" ? (
        // Magnifying glass scouting plate
        <g transform="translate(18, 12)">
          <line x1="56" y1="50" x2="67" y2="62" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
          <circle
            cx="50"
            cy="42"
            r="12"
            fill="color-mix(in srgb, var(--surface-strong) 60%, transparent)"
            stroke="var(--text)"
            strokeWidth="2.2"
          />
          <path d="M44 38 A8 8 0 0 1 52 34" fill="none" stroke="var(--surface-strong)" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ) : mood === "known_found" ? (
        // Verified badge in hand
        <g transform="translate(14, 20)">
          <circle cx="62" cy="46" r="9" fill="var(--positive, #2e7d32)" stroke="var(--surface-strong)" strokeWidth="1.8" />
          <path d="M59 46 L61.5 48.5 L65.5 43.5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : mood === "unknown_guide" ? (
        // Clipboard in hand
        <g transform="translate(15, 18)">
          <rect x="52" y="32" width="16" height="22" rx="2.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.8" />
          <rect x="56" y="30" width="8" height="4" rx="1" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <line x1="56" y1="38" x2="64" y2="38" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="56" y1="43" x2="64" y2="43" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="56" y1="48" x2="61" y2="48" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      ) : mood === "claimed_warn" ? (
        // Caution triangle
        <g transform="translate(16, 20)">
          <polygon points="62,35 53,51 71,51" fill="var(--negative, #d32f2f)" stroke="var(--surface-strong)" strokeWidth="1.5" />
          <line x1="62" y1="40" x2="62" y2="45" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="62" cy="48" r="0.9" fill="white" />
        </g>
      ) : mood === "upload_doc" ? (
        // Document folder
        <g transform="translate(14, 20)">
          <path
            d="M52 38 C52 36 54 35 56 35 H61 L64 38 H69 C71 38 72 39 72 41 V52 C72 54 71 55 69 55 H56 C54 55 52 54 52 52 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1.6"
          />
          <path d="M57 44 L62 48 L67 44" fill="none" stroke="var(--text)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : mood === "success" ? (
        // Gold celebratory trophy
        <g transform="translate(14, 18)">
          <path
            d="M54 36 H70 V44 C70 48.5 66 52 62 52 C58 52 54 48.5 54 44 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1.6"
          />
          <path d="M54 39 H50 C48.5 39 47.5 41 48 43 C49 46 51 47 54 47" fill="none" stroke="var(--text)" strokeWidth="1.4" />
          <path d="M70 39 H74 C75.5 39 76.5 41 76 43 C75 46 73 47 70 47" fill="none" stroke="var(--text)" strokeWidth="1.4" />
          <line x1="62" y1="52" x2="62" y2="57" stroke="var(--text)" strokeWidth="2.2" />
          <line x1="56" y1="57" x2="68" y2="57" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}

const COMPANION_TIPS = [
  "Tip: Always verify the vehicle IDV against the policy schedule to avoid dispute!",
  "Pro-tip: Clear, legible policy copy photos speed up admin verification within minutes.",
  "Keep going! Every verified claim directly boosts your monthly slab payout.",
  "SecureDrive Shield: Check customer PIN codes to ensure your state incentive rule applies!",
  "Double-check policy numbers: typos are the #1 reason claims get held for review.",
  "Vehicle category mismatch? Click the IND badge on the plate to switch between 2W, 4W, and CW.",
];

/**
 * Interactive Guide Companion Banner placed above or alongside the claim form.
 * Pip guides the agent step-by-step with tips, live status, speech bubble, and interactive encouragement.
 */
export function ClaimGuideBanner({
  mood,
  title,
  message,
  badgeText,
  badgeTone = "accent",
}: {
  mood: ClaimMascotMood;
  title: string;
  message: string;
  badgeText?: string;
  badgeTone?: "accent" | "positive" | "warning" | "negative" | "neutral";
}) {
  const [bounce, setBounce] = useState(0);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  const handlePipClick = () => {
    setBounce((n) => n + 1);
    setTipIndex((prev) => (prev === null ? 0 : (prev + 1) % COMPANION_TIPS.length));
  };

  const activeMessage = tipIndex !== null ? COMPANION_TIPS[tipIndex] : message;
  const isCustomTip = tipIndex !== null;

  return (
    <div className="relative overflow-hidden rounded-tile border border-divider/80 bg-surface/90 p-3.5 sm:p-4 shadow-card transition-all">
      <div className="flex items-start gap-4">
        {/* Clickable Mascot with interactive bounce & prompt badge */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={handlePipClick}
            title="Click Pip for agent tips & guidance"
            className="group relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full p-0.5"
          >
            <div
              key={bounce}
              className="transition-transform duration-150 active:scale-[0.97]"
            >
              <ClaimPortalMascot mood={mood} className="h-14 w-16 sm:h-16 sm:w-20" />
            </div>
            <span className="sr-only">Pip the Claim Companion</span>
          </button>
          <span className="mt-0.5 text-[9px] font-semibold text-ink-faint hover:text-ink cursor-pointer select-none">
            {isCustomTip ? "Next tip" : "Agent tip"}
          </span>
        </div>

        {/* Speech-tail bubble container */}
        <div className="relative min-w-0 flex-1 rounded-tile border border-divider/70 bg-surface-strong/80 p-3 shadow-xs">
          {/* Subtle speech tail pointing towards Pip */}
          <div
            aria-hidden="true"
            className="absolute -left-2 top-4 size-3 rotate-45 border-b border-l border-divider/70 bg-surface-strong/80"
          />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-ink">
                  {isCustomTip ? "Agent guide" : title}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isCustomTip && (
                  <button
                    type="button"
                    onClick={() => setTipIndex(null)}
                    className="text-[10px] text-ink-muted hover:text-ink underline"
                  >
                    Back to status
                  </button>
                )}
                {badgeText && !isCustomTip && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums border",
                      badgeTone === "positive"
                        ? "border-positive/30 bg-positive-soft text-positive"
                        : badgeTone === "warning"
                          ? "border-warning/30 bg-warning-soft text-warning"
                          : badgeTone === "negative"
                            ? "border-negative/30 bg-negative-soft text-negative"
                            : "border-accent-strong/40 bg-accent-soft text-ink",
                    )}
                  >
                    {badgeText}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed select-text">
              {activeMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
