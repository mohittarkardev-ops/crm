"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { chipFor } from "@/lib/status";
import type {
  ActionState,
  Column,
  EditAction,
  FilterDef,
  PreviewResult,
  PrimaryAction,
  Row,
  RowAction,
  TabsDef,
} from "@/lib/module-types";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  DEFAULT_DATE_RANGE,
  DateRangeFilter,
  rangeOf,
  todayIST,
  type DateRangeValue,
} from "@/components/ui/date-range-filter";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldGrid } from "@/components/ui/field";
import { PendingBar } from "@/components/ui/pending-bar";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";

type ModulePageProps = {
  title?: string;
  columns: Column[];
  rows?: Row[];
  /** Search input placeholder; omit to hide search. */
  search?: string;
  filters?: FilterDef[];
  tabs?: TabsDef;
  /** Adds a date selector (presets plus custom date or range) on the date column `key`, soonest first. */
  dateFilter?: { key: string; label: string };
  primary?: PrimaryAction;
  /** Adds an Edit button to every row. */
  edit?: EditAction;
  rowActions?: RowAction[];
  emptyLabel: string;
  /** When set, each row gets a View button linking to `${rowHref}/${row.id}`. */
  rowHref?: string;
  index?: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function renderCell(column: Column, row: Row) {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return <span className="text-ink-faint">—</span>;

  switch (column.type) {
    case "person":
      return (
        <span className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink">
            {initials(String(value))}
          </span>
          <span className="truncate font-medium">{String(value)}</span>
        </span>
      );
    case "chip": {
      const chip = chipFor(String(value));
      return <Chip tone={chip.tone}>{chip.label}</Chip>;
    }
    case "inr":
      return <span className="tabular-nums">{formatINR(Number(value))}</span>;
    case "date":
      return <span className="tabular-nums">{formatDate(String(value))}</span>;
    case "number":
      return <span className="tabular-nums">{formatNumber(Number(value))}</span>;
    default:
      return String(value);
  }
}

/**
 * The form inside a drawer. Mounted only while the drawer is open, so every open starts clean.
 * While saving: a spinner in the Save button, the fields dimmed and locked, and (after 0.4 s) a moving bar.
 */
function PrimaryForm({
  primary,
  initialValues,
  onClose,
}: {
  primary: PrimaryAction;
  initialValues?: Record<string, string>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(primary.action, { ok: false } as ActionState);
  const handled = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [watch, setWatch] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Track what is typed so fields can appear or disappear depending on other fields.
  function onFormChange() {
    if (!formRef.current) return;
    const next: Record<string, string> = {};
    for (const [key, value] of new FormData(formRef.current).entries()) {
      if (typeof value === "string") next[key] = value;
    }
    setWatch(next);
    setPreview(null);
  }

  async function checkRecipients() {
    if (!primary.preview || !formRef.current) return;
    setChecking(true);
    setPreview(null);
    try {
      setPreview(await primary.preview(new FormData(formRef.current)));
    } catch {
      setPreview({ ok: false, error: "Could not check the recipients. Please try again." });
    } finally {
      setChecking(false);
    }
  }

  // On success: confirm, close, and optionally go to the new record.
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    toast(state.message ?? "Saved.");
    onClose();
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state, onClose, router]);

  // Re-create the fields after an error so they show the values that were typed.
  const errorKey = `${state.error ?? ""}|${Object.keys(state.fieldErrors ?? {}).join(",")}`;

  return (
    <form ref={formRef} action={formAction} onChange={onFormChange} noValidate aria-busy={pending}>
      <PendingBar active={pending || checking} className="-mt-2 mb-3" />
      {state.error && (
        <p role="alert" className="mb-4 rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0 transition-opacity", pending && "opacity-60")}>
        <FieldGrid
          key={errorKey}
          fields={primary.fields}
          errors={state.fieldErrors}
          values={state.values ?? initialValues}
          watch={watch}
          onFieldChange={onFormChange}
        />
      </fieldset>
      {preview && (
        <div
          className={cn(
            "mt-4 rounded-tile p-3 text-sm",
            preview.ok ? "bg-surface-muted text-ink" : "bg-negative-soft text-negative",
          )}
        >
          <p className="select-text">{preview.ok ? preview.summary : preview.error}</p>
          {preview.ok && preview.copyText && (
            <button
              type="button"
              className="mt-2 text-xs font-medium underline underline-offset-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(preview.copyText ?? "");
                  toast("Copied to the clipboard.");
                } catch {
                  toast("Could not copy. Select the text manually.", "error");
                }
              }}
            >
              {preview.copyLabel ?? "Copy"}
            </button>
          )}
        </div>
      )}
      <div className="sticky bottom-0 -mx-6 -mb-5 mt-6 flex justify-end gap-2 border-t border-divider bg-surface-strong px-6 py-4">
        {primary.preview && (
          <Button variant="secondary" className="mr-auto" onClick={checkRecipients} loading={checking} disabled={pending}>
            Check recipients
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}

/** Opens the edit form for one row, pre-filled from the row's values. */
function EditForm({ edit, row, onClose }: { edit: EditAction; row: Row; onClose: () => void }) {
  const action = useCallback(
    (previous: ActionState, formData: FormData) => edit.action(row.id, previous, formData),
    [edit, row.id],
  );
  const initialValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const field of edit.fields) {
      const value = row[field.name];
      out[field.name] = value === null || value === undefined ? "" : String(value);
    }
    return out;
  }, [edit.fields, row]);

  return (
    <PrimaryForm
      primary={{ label: "Save", drawerTitle: edit.drawerTitle, fields: edit.fields, action }}
      initialValues={initialValues}
      onClose={onClose}
    />
  );
}

function RowActionButtons({
  row,
  actions,
  onBusy,
}: {
  row: Row;
  actions: RowAction[];
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: RowAction) {
    if (busy) return;
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusy(action.label);
    onBusy(true);
    try {
      const result = await action.action(row.id);
      if (result.ok) toast(result.message ?? "Done.");
      else toast(result.error ?? "Could not complete this action.", "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(null);
      onBusy(false);
    }
  }

  return (
    <>
      {actions
        .filter((action) => !action.showWhen || action.showWhen.in.includes(String(row[action.showWhen.key])))
        .map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={busy !== null}
            aria-busy={busy === action.label}
            onClick={() => run(action)}
            className={buttonStyles(
              "ghost",
              cn("h-8 px-3 text-xs", action.danger && "text-negative hover:bg-negative-soft"),
            )}
          >
            {busy === action.label && <Spinner size={12} />}
            {action.label}
          </button>
        ))}
    </>
  );
}

/**
 * One reusable list screen: toolbar (search, filters, primary action) + table + empty state.
 * Rows come from Supabase; forms save through server actions passed in `primary`, `edit` and `rowActions`.
 */
export function ModulePage({
  title,
  columns,
  rows = [],
  search,
  filters = [],
  tabs,
  dateFilter,
  primary,
  edit,
  rowActions,
  emptyLabel,
  rowHref,
  index,
}: ModulePageProps) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [tab, setTab] = useState(tabs?.options[0]?.value ?? "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const bounds = dateFilter ? rangeOf(dateRange, todayIST()) : null;
    const result = rows.filter((row) => {
      if (tabs && tab !== "all" && String(row[tabs.key]) !== tab) return false;
      for (const [key, value] of Object.entries(filterValues)) {
        if (value !== "all" && String(row[key]) !== value) return false;
      }
      if (q && !Object.values(row).some((v) => typeof v === "string" && v.toLowerCase().includes(q))) {
        return false;
      }
      if (bounds && dateFilter) {
        const date = String(row[dateFilter.key] ?? "");
        if (!date || (bounds.from && date < bounds.from) || (bounds.to && date > bounds.to)) return false;
      }
      return true;
    });
    if (bounds && dateFilter) {
      // Soonest first, so the policies that need action next are on top. Expired: most recent first.
      const key = dateFilter.key;
      const direction = dateRange.mode === "expired" ? -1 : 1;
      result.sort((a, b) => direction * String(a[key]).localeCompare(String(b[key])));
    }
    return result;
  }, [rows, query, filterValues, tab, tabs, dateFilter, dateRange]);

  const hasLastCell = Boolean(rowHref) || Boolean(edit) || (rowActions?.length ?? 0) > 0;

  return (
    <>
      <Card index={index}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-rule pb-3">
          <div className="flex flex-wrap items-center gap-3">
            {title && <h2 className="text-[15px] font-semibold leading-[22px] text-ink">{title}</h2>}
            {tabs && <Segmented label={tabs.label} options={tabs.options} value={tab} onChange={setTab} />}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <label className="flex h-10 w-56 items-center gap-2 rounded-control border border-divider bg-white/80 px-3 text-ink-faint focus-within:border-accent-strong">
                <Search size={16} strokeWidth={1.75} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search"
                  placeholder={search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </label>
            )}
            {filters.map((filter) => (
              <select
                key={filter.key}
                aria-label={filter.label}
                value={filterValues[filter.key] ?? "all"}
                onChange={(event) => setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }))}
                className="h-10 rounded-control border border-divider bg-white/80 px-3 text-sm text-ink outline-none focus:border-accent-strong"
              >
                <option value="all">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
            {dateFilter && <DateRangeFilter label={dateFilter.label} value={dateRange} onChange={setDateRange} />}
            {primary && (
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                {primary.label}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-ink-muted",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  aria-busy={busyRowId === row.id}
                  className={cn(
                    "h-14 border-t border-divider transition-[opacity,background-color] hover:bg-accent-soft/40",
                    busyRowId === row.id && "opacity-50",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("pr-4 text-sm text-ink", column.align === "right" && "text-right")}
                    >
                      {renderCell(column, row)}
                    </td>
                  ))}
                  {hasLastCell && (
                    <td className="whitespace-nowrap text-right">
                      {edit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(row);
                            setEditOpen(true);
                          }}
                          className={buttonStyles("ghost", "h-8 px-3 text-xs")}
                        >
                          Edit
                        </button>
                      )}
                      {rowActions && (
                        <RowActionButtons
                          row={row}
                          actions={rowActions}
                          onBusy={(busy) => setBusyRowId(busy ? row.id : null)}
                        />
                      )}
                      {rowHref && (
                        <Link href={`${rowHref}/${row.id}`} className={buttonStyles("ghost", "h-8 px-3 text-xs")}>
                          View
                          <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" />
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <EmptyState label={emptyLabel} />}
        </div>
      </Card>

      {primary && (
        <Drawer open={open} title={primary.drawerTitle} onClose={() => setOpen(false)}>
          <PrimaryForm primary={primary} onClose={() => setOpen(false)} />
        </Drawer>
      )}

      {edit && (
        <Drawer open={editOpen} title={edit.drawerTitle} onClose={() => setEditOpen(false)}>
          {editing && <EditForm key={editing.id} edit={edit} row={editing} onClose={() => setEditOpen(false)} />}
        </Drawer>
      )}
    </>
  );
}
