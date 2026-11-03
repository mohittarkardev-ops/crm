import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"section"> & {
  /** Position in the page, used to stagger the entry animation (40ms each). */
  index?: number;
};

/** Base card (design.md section 4). */
export function Card({ className, index = 0, style, ...props }: CardProps) {
  const merged: CSSProperties = { animationDelay: `${index * 40}ms`, ...style };
  return <section className={cn("glass fade-up rounded-card p-5 shadow-card", className)} style={merged} {...props} />;
}

/** Title on the left, optional controls on the right, then the 1.5px dark rule. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3 border-b-[1.5px] border-rule pb-3", className)}>
      <h2 className="text-[15px] font-semibold leading-[22px] text-ink">{title}</h2>
      {action}
    </div>
  );
}

/** Nested tile inside a card. Never nest a full Card inside a Card. */
export function Tile({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-tile bg-surface-muted p-4", className)} {...props} />;
}
