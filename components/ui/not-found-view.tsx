"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export type NotFoundQuickLink = {
  href: string;
  label: string;
};

type NotFoundViewProps = {
  primaryHref?: string;
  primaryLabel?: string;
  quickLinks?: NotFoundQuickLink[];
  canSearch?: boolean;
  showBack?: boolean;
};

/**
 * Hudson-styled 404 illustration featuring Pip, the SecureDrive Policy Scout,
 * using strictly CSS design tokens (no hard-coded hex values).
 */
function PolicyScoutIllustration() {
  return (
    <svg
      viewBox="0 0 240 190"
      className="h-40 w-52 shrink-0 select-none sm:h-44 sm:w-56"
      role="img"
      aria-label="Pip the policy scout inspecting a missing file"
    >
      {/* Floor shadow */}
      <ellipse cx="118" cy="172" rx="76" ry="8" fill="var(--surface-muted)" />

      {/* Soft Hudson yellow backdrop badge */}
      <rect x="44" y="26" width="144" height="122" rx="22" fill="var(--accent-soft)" />

      {/* Folder back tab */}
      <path
        d="M52 84 C52 78 56 74 62 74 H88 L96 84 H158 C164 84 168 88 168 94 V142 C168 148 164 152 158 152 H62 C56 152 52 148 52 142 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Slipped 404 policy slip floating at the side */}
      <g className="scout-float" style={{ animationDelay: "-1.4s" }}>
        <g transform="rotate(10 184 96)">
          <rect
            x="156"
            y="58"
            width="56"
            height="72"
            rx="8"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2.2"
          />
          <rect x="165" y="68" width="22" height="10" rx="3" fill="var(--accent)" />
          <text
            x="176"
            y="75.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="var(--text)"
            letterSpacing="0.06em"
          >
            404
          </text>
          <line x1="165" y1="88" x2="202" y2="88" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="165" y1="98" x2="196" y2="98" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="165" y1="108" x2="188" y2="108" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="197" cy="116" r="4" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.6" />
        </g>
      </g>

      {/* Character: Pip the Shield-Scout peeking out of the folder */}
      <g>
        {/* Shield torso / head */}
        <path
          d="M110 38 C128 38 144 45 144 53 V92 C144 114 110 128 110 128 C110 128 76 114 76 92 V53 C76 45 92 38 110 38 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* Top crest yellow accent */}
        <path
          d="M92 47 C99 44 105 43 110 43 C115 43 121 44 128 47"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Eyebrows (curious tilt) */}
        <path
          d="M93 64 Q98 60 103 63"
          fill="none"
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M118 62 Q123 58 128 62"
          fill="none"
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Blinking curious eyes looking slightly right toward the slip */}
        <g className="scout-blink">
          <ellipse cx="99" cy="73" rx="3.4" ry="4.2" fill="var(--text)" />
          <circle cx="100.3" cy="71.4" r="1.2" fill="var(--surface-strong)" />
          <ellipse cx="123" cy="73" rx="3.4" ry="4.2" fill="var(--text)" />
          <circle cx="124.3" cy="71.4" r="1.2" fill="var(--surface-strong)" />
        </g>

        {/* Cheek accents */}
        <circle cx="89" cy="80" r="3" fill="var(--accent-soft)" />
        <circle cx="132" cy="80" r="3" fill="var(--accent-soft)" />

        {/* Expressive tiny puzzled mouth */}
        <circle cx="111.5" cy="83.5" r="2.6" fill="var(--text)" />
      </g>

      {/* Folder front pocket overlapping Pip's lower half */}
      <rect
        x="48"
        y="96"
        width="124"
        height="58"
        rx="10"
        fill="var(--surface)"
        stroke="var(--text)"
        strokeWidth="2.2"
      />
      <rect x="64" y="112" width="42" height="8" rx="3" fill="var(--accent)" />
      <line x1="64" y1="128" x2="128" y2="128" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="64" y1="137" x2="104" y2="137" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Pip's hand + magnifying glass inspecting the missing slip */}
      <g className="scout-float">
        {/* Little paw gripping the handle */}
        <circle cx="144" cy="112" r="6.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.2" />
        {/* Handle */}
        <line x1="149" y1="108" x2="163" y2="96" stroke="var(--text)" strokeWidth="4.2" strokeLinecap="round" />
        {/* Lens */}
        <circle
          cx="176"
          cy="83"
          r="16"
          fill="color-mix(in srgb, var(--surface-strong) 55%, transparent)"
          stroke="var(--text)"
          strokeWidth="2.6"
        />
        {/* Lens highlight */}
        <path
          d="M168 77 A11 11 0 0 1 179 72"
          fill="none"
          stroke="var(--surface-strong)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function NotFoundView({
  primaryHref = "/",
  primaryLabel = "Go to Dashboard",
  quickLinks = [],
  canSearch = false,
  showBack = true,
}: NotFoundViewProps) {
  const router = useRouter();

  function openGlobalSearch() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));
  }

  return (
    <Card className="mx-auto mt-6 max-w-2xl p-6 sm:mt-10 sm:p-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-8">
        <PolicyScoutIllustration />

        <div className="min-w-0 flex-1 text-center md:text-left">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <Chip tone="accent">404 · Not found</Chip>
            <span className="text-[11px] font-medium text-ink-faint">Missing route or record</span>
          </div>

          <h2 className="text-xl font-bold leading-snug text-ink">
            Looks like this file slipped out of the cabinet.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            That address may have a typo, or the policy, claim, or ticket you opened was moved or deleted.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <Link href={primaryHref} className={buttonStyles("primary")}>
              {primaryLabel}
              <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </Link>

            {showBack && (
              <Button variant="secondary" onClick={() => router.back()}>
                <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
                Go back
              </Button>
            )}

            {canSearch && (
              <Button variant="ghost" onClick={openGlobalSearch}>
                <Search size={14} strokeWidth={1.75} aria-hidden="true" />
                Search CRM
                <kbd className="rounded-[3px] border border-divider bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-faint">
                  /
                </kbd>
              </Button>
            )}
          </div>
        </div>
      </div>

      {quickLinks.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-divider pt-4 md:justify-start">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Available screens
          </span>
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control border border-divider bg-surface-strong px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent-strong hover:bg-accent-soft/40 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
