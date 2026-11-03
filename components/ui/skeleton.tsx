import { cn } from "@/lib/cn";

/** Shimmering placeholder block (design.md section 4: loading uses skeletons, never a full-page spinner). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
