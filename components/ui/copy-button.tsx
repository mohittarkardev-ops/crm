"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "@/components/ui/toaster";

/**
 * Tactile copy trigger that morphs smoothly into a crisp "Copied ✓" state for 1.5s.
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  toastMessage,
  errorMessage = "Could not copy automatically.",
  title = "Copy to clipboard",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  toastMessage?: string;
  errorMessage?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (toastMessage) toast(toastMessage);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(errorMessage, "error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border border-divider bg-surface-strong px-2.5 py-1 text-[11px] font-medium text-ink transition-[background-color,border-color,color,transform] duration-150 hover:bg-surface-muted active:scale-[0.97]",
        copied && "border-positive/40 bg-positive-soft/60 text-positive",
        className,
      )}
    >
      {copied ? (
        <Check size={12} strokeWidth={2.25} className="check-pop shrink-0" aria-hidden="true" />
      ) : (
        <Copy size={12} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
