import type { ReactNode } from "react";

export type DetailItem = { label: string; value: ReactNode };

/** Label / value grid used on detail pages. Empty values show a dash. */
export function DetailList({ items, columns = 2 }: { items: DetailItem[]; columns?: 1 | 2 }) {
  return (
    <dl className={columns === 2 ? "grid gap-x-6 gap-y-4 sm:grid-cols-2" : "grid gap-y-4"}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-ink-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-ink-faint">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
