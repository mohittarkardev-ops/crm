import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

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
    "inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium transition-[background-color,border-color,color,transform,filter] duration-150 enabled:active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
    variant === "icon" ? "size-9" : "h-10 px-4",
    VARIANTS[variant],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  /** Shows a spinner before the label and blocks further clicks while a save or request is running. */
  loading?: boolean;
  /** Shows a crisp check confirmation morph immediately after a quick save or export finishes. */
  saved?: boolean;
  /** Optional replacement text while `saved` is true (e.g. "Saved", "Exported"). */
  savedLabel?: string;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  loading = false,
  saved = false,
  savedLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const showSaved = saved && !loading;
  return (
    <button
      type={type}
      className={cn(buttonStyles(variant, className), loading && "disabled:opacity-100")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : showSaved ? (
        <Check
          size={15}
          strokeWidth={2.25}
          className={cn("check-pop shrink-0", variant === "primary" ? "text-accent" : "text-positive")}
          aria-hidden="true"
        />
      ) : null}
      {showSaved && savedLabel ? savedLabel : children}
    </button>
  );
}
