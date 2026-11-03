import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { STATUS_META, chipFor, type ChipTone, type PolicyStatus } from "@/lib/status";

const TONES: Record<ChipTone, string> = {
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  negative: "bg-negative-soft text-negative",
  info: "bg-info-soft text-info",
  accent: "bg-accent text-ink",
  neutral: "bg-cat-grey/60 text-ink-muted",
};

type ChipProps = ComponentProps<"span"> & { tone?: ChipTone };

export function Chip({ tone = "neutral", className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] px-2 py-1 text-[10px] font-semibold uppercase leading-[12px] tracking-wide",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Any status-like value (verified, in_progress, bike...) as a chip. */
export function ValueChip({ value }: { value: string }) {
  const chip = chipFor(value);
  return <Chip tone={chip.tone}>{chip.label}</Chip>;
}

/** Policy status chip using the shared status mapping. */
export function StatusChip({ status }: { status: PolicyStatus }) {
  const meta = STATUS_META[status];
  return <Chip tone={meta.tone}>{meta.label}</Chip>;
}
