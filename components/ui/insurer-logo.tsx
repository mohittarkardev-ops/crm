"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

function insurerMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(of|and|&|the|in)$/i.test(w));
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  const single = words[0] ?? name.trim();
  return single.slice(0, 2).toUpperCase() || "IN";
}

export function safeInsurerLogoUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

/**
 * Compact rounded square insurer mark. Renders the insurer's `logo_url` when set and valid,
 * or automatically falls back to a crisp Hudson monogram badge while `logo_url` is empty/unloaded.
 */
export function InsurerLogo({
  name,
  logoUrl,
  size = "sm",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const src = safeInsurerLogoUrl(logoUrl);
  const showImage = Boolean(src) && failedUrl !== src;
  const boxClass = size === "md" ? "size-6 rounded-[4px]" : "size-5 rounded-[4px]";

  if (showImage && src) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden border border-divider bg-white p-0.5",
          boxClass,
          className,
        )}
      >
        {/* External/CDN URLs vary across insurer domains; plain <img> avoids Next image domain allowlist errors. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(src)}
          className="size-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center border border-divider bg-surface-muted font-bold uppercase tracking-tight text-ink-muted select-none",
        size === "md" ? "size-6 rounded-[4px] text-[10px]" : "size-5 rounded-[4px] text-[9px]",
        className,
      )}
    >
      {insurerMonogram(name)}
    </span>
  );
}

/** Inline insurer name paired with its logo (or monogram badge when `showFallback` is true). */
export function InsurerBadge({
  name,
  logoUrl,
  showFallback = true,
  size = "sm",
  className,
}: {
  name: string;
  logoUrl?: string | null;
  /** If false, only draws the logo square once a valid `logoUrl` exists in the database. */
  showFallback?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const hasUrl = Boolean(safeInsurerLogoUrl(logoUrl));
  if (!hasUrl && !showFallback) {
    return <span className={cn("truncate", className)} title={name}>{name}</span>;
  }
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <InsurerLogo name={name} logoUrl={logoUrl} size={size} />
      <span className="truncate" title={name}>
        {name}
      </span>
    </span>
  );
}
