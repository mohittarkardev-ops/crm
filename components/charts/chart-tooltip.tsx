/** White tooltip card shared by all Recharts charts (design.md 4.4). */
export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string; name?: string | number }>;
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-tile bg-white px-3 py-2 text-xs shadow-card">
      {label !== undefined && <p className="font-medium text-ink-muted">{label}</p>}
      <p className="font-semibold tabular-nums text-ink">
        {item.name}: {item.value}
        {unit}
      </p>
    </div>
  );
}
