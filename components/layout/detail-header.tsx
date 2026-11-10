import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Back link, title, status chips and optional actions at the top of a detail page. */
export function DetailHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  chips,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft
          size={14}
          strokeWidth={1.75}
          className="transition-transform duration-150 group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-bold leading-7 text-ink">{title}</h2>
          {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          {chips && <div className="mt-2 flex flex-wrap gap-2">{chips}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
