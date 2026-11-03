import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85",
  secondary: "bg-white text-ink border border-divider hover:bg-surface-strong",
  ghost: "bg-transparent text-ink-muted hover:bg-accent-soft",
  danger: "bg-negative-soft text-negative hover:brightness-95",
  icon: "bg-transparent text-ink-muted hover:bg-accent-soft",
};

/** Class string so links and buttons share one look (design.md 4.5). */
export function buttonStyles(variant: ButtonVariant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    variant === "icon" ? "size-9" : "h-10 px-4",
    VARIANTS[variant],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles(variant, className)} {...props} />;
}
