import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Inbox, type LucideIcon } from "lucide-react";

/** Empty state: optional character illustration or soft outlined icon, short label, and optional quick action. */
export function EmptyState({
  label,
  hint,
  icon: Icon = Inbox,
  illustration,
  action,
  className,
}: {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  illustration?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-center", className)}>
      {illustration ?? (
        <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-ink-faint">
          <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm text-ink-muted">{label}</p>
        {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
