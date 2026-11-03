import { cn } from "@/lib/cn";
import { Inbox, type LucideIcon } from "lucide-react";

/** Empty state: soft outlined icon plus one short label (design.md 4.11). */
export function EmptyState({
  label,
  icon: Icon = Inbox,
  className,
}: {
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-faint">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}
