import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";

export function StatRow({ children, columns = 4 }: { children: React.ReactNode; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        columns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

/** Stat tile: coloured left bar, bold number, UPPERCASE label (design.md section 4). */
export function MiniStat({
  title,
  icon: Icon,
  value = 0,
  kind,
  index = 0,
}: {
  title: string;
  icon: LucideIcon;
  value?: number;
  kind?: "number" | "inr" | "percent";
  index?: number;
}) {
  return (
    <Card index={index} className="p-4">
      <div className={cn("border-l-[3px] pl-3", index % 2 === 0 ? "border-accent" : "border-ink-faint")}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[22px] font-bold leading-7 text-ink">
            <CountUp value={value} kind={kind} />
          </p>
          <Icon size={16} strokeWidth={1.75} className="mt-1 text-ink-faint" aria-hidden="true" />
        </div>
        <h2 className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{title}</h2>
      </div>
    </Card>
  );
}
