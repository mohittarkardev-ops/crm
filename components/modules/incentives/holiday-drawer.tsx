"use client";

import { useState } from "react";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTROL } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { addIncentiveHoliday, deleteIncentiveHoliday } from "@/lib/actions/incentives";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { HolidayItem } from "@/lib/incentives";

export function HolidayDrawer({
  open,
  holidays,
  onClose,
}: {
  open: boolean;
  holidays: HolidayItem[];
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await addIncentiveHoliday(date, label);
      if (res.ok) {
        toast(res.message ?? "Holiday added.");
        setDate("");
        setLabel("");
      } else {
        toast(res.error ?? "Could not add holiday.", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (holidayDate: string) => {
    setBusy(true);
    try {
      const res = await deleteIncentiveHoliday(holidayDate);
      if (res.ok) toast(res.message ?? "Holiday removed.");
      else toast(res.error ?? "Could not remove holiday.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Non-Working Holidays">
      <div className="space-y-5">
        <p className="text-xs leading-relaxed text-ink-muted">
          Mark public holidays or company off-days below. CSEs will not forfeit daily incentives on excluded dates.
        </p>

        <form onSubmit={handleAdd} className="space-y-3 rounded-tile border border-divider bg-surface-muted/35 p-3.5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-ink-muted">Date</span>
            <DatePicker value={date} onChange={setDate} placeholder="Select holiday date" />
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-muted">Holiday name</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Diwali, Republic Day"
              className={cn(CONTROL, "h-10")}
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit" loading={busy} disabled={!date || label.trim().length < 2} className="h-9 px-3 text-xs">
              <Plus size={14} />
              Add Holiday
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Holidays this month ({holidays.length})
          </h3>
          {holidays.length === 0 ? (
            <EmptyState label="No holidays marked this month" icon={CalendarOff} className="py-6" />
          ) : (
            <ul className="divide-y divide-divider rounded-tile border border-divider bg-surface-strong px-3">
              {holidays.map((h) => (
                <li key={h.date} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-ink">{h.label}</p>
                    <p className="text-[11px] text-ink-faint tabular-nums">{formatDate(h.date)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(h.date)}
                    aria-label={`Remove ${h.label}`}
                    className="grid size-7 place-items-center rounded-control text-ink-muted hover:bg-negative-soft hover:text-negative"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DrawerFooter>
      </div>
    </Drawer>
  );
}
