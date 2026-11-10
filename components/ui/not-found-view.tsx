"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PolicyScoutCharacter } from "@/components/ui/characters";
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
        <PolicyScoutCharacter />

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
