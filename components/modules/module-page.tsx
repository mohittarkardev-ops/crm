"use client";

import { Suspense, useActionState, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, FileText, Plus, Search } from "lucide-react";
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
import { RelaxedEmptyCharacter, SearchScoutCharacter } from "@/components/ui/characters";
import { Chip } from "@/components/ui/chip";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CopyButton } from "@/components/ui/copy-button";
import { CustomSelect } from "@/components/ui/custom-select";
import { InsurerBadge } from "@/components/ui/insurer-logo";
import {
  DEFAULT_DATE_RANGE,
  DateRangeFilter,
  rangeOf,
  todayIST,
  type DateRangeValue,
} from "@/components/ui/date-range-filter";
import { Drawer, DrawerFooter } from "@/components/ui/drawer";
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
  /** Adds a date selector (presets plus custom date or range) on the date column `key`. */
  dateFilter?: { key: string; label: string; direction?: "future" | "past" };
  primary?: PrimaryAction;
  /** Adds an Edit button to every row. */
  edit?: EditAction;
  rowActions?: RowAction[];
  emptyLabel: string;
  /** Optional custom empty-state illustration when rows.length === 0. */
  emptyIllustration?: ReactNode;
  /** When set, each row gets a View button linking to `${rowHref}/${row.id}`. */
  rowHref?: string;
  /** Enables a "Export CSV" button in the toolbar that downloads filtered rows across all pages. */
  exportName?: string;
  /** Optional total DB row count so the table warns if rows exceeded the in-memory cap. */
  totalCount?: number;
  /** Optional link shown alongside the truncation notice (e.g. Data Grid on Policies). */
  truncatedAction?: { href: string; label: string };
  /** Rows rendered per page in the client table (default 50). */
  pageSize?: number;
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
          <span className="max-w-[180px] truncate font-medium" title={String(value)}>
            {String(value)}
          </span>
        </span>
      );
    case "chip": {
      const chip = chipFor(String(value));
      return <Chip tone={chip.tone}>{chip.label}</Chip>;
    }
    case "inr":
      return <span className="whitespace-nowrap tabular-nums">{formatINR(Number(value))}</span>;
    case "date":
      return <span className="whitespace-nowrap tabular-nums">{formatDate(String(value))}</span>;
    case "number":
      return <span className="whitespace-nowrap tabular-nums">{formatNumber(Number(value))}</span>;
    case "image": {
      const url = String(value);
      if (!/^https?:\/\//i.test(url)) return <span className="text-ink-faint">—</span>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Open banner image"
          className="inline-block"
        >
          {/* External advisor URLs vary across hosts; plain img avoids Next domain allowlist failures. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Placement banner"
            className="h-8 w-14 rounded-control border border-divider bg-surface-muted object-cover"
          />
        </a>
      );
    }
    case "insurer": {
      const text = String(value);
      const rawLogo = row[`${column.key}LogoUrl`];
      const logoUrl = typeof rawLogo === "string" ? rawLogo : null;
      return <InsurerBadge name={text} logoUrl={logoUrl} showFallback={false} className="max-w-[240px]" />;
    }
    case "link": {
      const text = String(value);
      const rawHref = row[`${column.key}Href`];
      const href = typeof rawHref === "string" && rawHref ? rawHref : null;
      if (!href) return <span className="text-sm text-ink-muted">{text}</span>;
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink underline-offset-2 hover:underline"
        >
          <FileText size={13} strokeWidth={1.75} className="shrink-0 text-ink-muted" aria-hidden="true" />
          {text}
        </a>
      );
    }
    default: {
      const text = String(value);
      return (
        <span className="line-clamp-2 max-w-[260px]" title={text}>
          {text}
        </span>
      );
    }
  }
}

/**
 * The form inside a drawer. Mounted only while the drawer is open, so every open starts clean.
 * While saving: a spinner in the Save button, the fields dimmed and locked, and (after 0.4 s) a moving bar.
 */
export function PrimaryForm({
  primary,
  initialValues,
  contextValues,
  onClose,
  onSaved,
  onDirtyChange,
}: {
  primary: PrimaryAction;
  initialValues?: Record<string, string>;
  contextValues?: Record<string, string>;
  onClose: () => void;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const formId = useId();
  const [state, formAction, pending] = useActionState(primary.action, { ok: false } as ActionState);
  const handled = useRef<ActionState | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [watch, setWatch] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [errorPulse, setErrorPulse] = useState(0);

  // Track what is typed or selected so conditional `showWhen` fields appear immediately.
  function onFormChange(changedName?: string, changedValue?: string) {
    if (!formRef.current) return;
    const next: Record<string, string> = {};
    for (const [key, value] of new FormData(formRef.current).entries()) {
      if (typeof value === "string") next[key] = value;
    }
    if (changedName !== undefined && changedValue !== undefined) {
      next[changedName] = changedValue;
    }
    setWatch(next);
    setPreview(null);
    onDirtyChange?.(true);
  }

  // Handle failed server submits: clear stale watch overrides, pulse alert, focus first invalid control.
  useEffect(() => {
    if (!state.ok && state.values) {
      setWatch({});
    }
    if (!state.ok && (state.error || (state.fieldErrors && Object.keys(state.fieldErrors).length > 0))) {
      setErrorPulse((n) => n + 1);
      const firstKey = Object.keys(state.fieldErrors ?? {})[0];
      if (firstKey && formRef.current) {
        requestAnimationFrame(() => {
          const input = formRef.current?.querySelector<HTMLElement>(`[name="${CSS.escape(firstKey)}"]`);
          if (!input) return;
          const target =
            input instanceof HTMLInputElement && input.type === "hidden"
              ? (input.parentElement?.querySelector<HTMLElement>("button") ?? input)
              : input;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.focus({ preventScroll: true });
        });
      }
    }
  }, [state]);

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

  // On success: confirm, reset dirty flag, close, and optionally go to the new record.
  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    onDirtyChange?.(false);
    onSaved?.();
    toast(state.message ?? "Saved.");
    onClose();
    if (state.redirectTo) router.push(state.redirectTo);
  }, [state, onClose, onDirtyChange, onSaved, router]);

  // Re-create the fields after an error so they show the values that were typed.
  const errorKey = `${state.error ?? ""}|${Object.keys(state.fieldErrors ?? {}).join(",")}`;
  const liveValues = { ...(initialValues ?? {}), ...(state.values ?? {}), ...watch };

  return (
    <form id={formId} ref={formRef} action={formAction} onChange={() => onFormChange()} noValidate aria-busy={pending}>
      <PendingBar active={pending || checking} className="-mt-2 mb-3" />
      {state.error && (
        <p key={errorPulse} role="alert" className="micro-shake mb-4 rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      {primary.header?.(liveValues)}
      <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0 transition-opacity", pending && "opacity-60")}>
        <FieldGrid
          key={errorKey}
          fields={primary.fields}
          errors={state.fieldErrors}
          values={state.values ?? initialValues}
          contextValues={contextValues}
          watch={watch}
          onFieldChange={onFormChange}
        />
      </fieldset>
      {preview && (
        <div
          className={cn(
            "reveal-down mt-4 rounded-tile p-3 text-sm",
            preview.ok ? "bg-surface-muted text-ink" : "bg-negative-soft text-negative",
          )}
        >
          <p className="select-text">{preview.ok ? preview.summary : preview.error}</p>
          {preview.ok && preview.copyText && (
            <div className="mt-2">
              <CopyButton
                text={preview.copyText}
                label={preview.copyLabel ?? "Copy"}
                toastMessage="Copied to the clipboard."
                errorMessage="Could not copy. Select the text manually."
              />
            </div>
          )}
        </div>
      )}
      <DrawerFooter>
        {primary.preview && (
          <Button variant="secondary" className="mr-auto" onClick={checkRecipients} loading={checking} disabled={pending}>
            Check recipients
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={pending}>
          Save
        </Button>
      </DrawerFooter>
    </form>
  );
}

/** Opens the edit form for one row, pre-filled from the row's values. */
function EditForm({
  edit,
  row,
  onClose,
  onSaved,
  onDirtyChange,
}: {
  edit: EditAction;
  row: Row;
  onClose: () => void;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
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
  const contextValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && v !== undefined) out[k] = String(v);
    }
    return out;
  }, [row]);

  return (
    <PrimaryForm
      primary={{ label: "Save", drawerTitle: edit.drawerTitle, fields: edit.fields, action }}
      initialValues={initialValues}
      contextValues={contextValues}
      onClose={onClose}
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />
  );
}

function RowActionButtons({
  row,
  actions,
  onBusy,
  onFlashed,
}: {
  row: Row;
  actions: RowAction[];
  onBusy: (busy: boolean) => void;
  onFlashed: (rowId: string, tone: "positive" | "accent") => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function execute(action: RowAction) {
    if (busy) return;
    setBusy(action.label);
    onBusy(true);
    try {
      const result = await action.action(row.id);
      if (result.ok) {
        if (result.message) toast(result.message);
        if (result.redirectTo) router.push(result.redirectTo);
        else onFlashed(row.id, action.danger ? "accent" : "positive");
      } else {
        toast(result.error ?? "Could not complete this action.", "error");
      }
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
        .map((action) => {
          const btnClass = buttonStyles(
            "ghost",
            cn("h-8 px-3 text-xs", action.danger && "text-negative hover:bg-negative-soft"),
          );
          if (action.confirm) {
            return (
              <ConfirmButton
                key={action.label}
                title={`${action.label}?`}
                description={action.confirm}
                confirmLabel={action.label}
                tone={action.danger ? "danger" : "primary"}
                loading={busy === action.label}
                disabled={busy !== null}
                onConfirm={() => execute(action)}
                className={btnClass}
              >
                {action.label}
              </ConfirmButton>
            );
          }
          return (
            <button
              key={action.label}
              type="button"
              disabled={busy !== null}
              aria-busy={busy === action.label}
              onClick={() => execute(action)}
              className={btnClass}
            >
              {busy === action.label && <Spinner size={12} />}
              {action.label}
            </button>
          );
        })}
    </>
  );
}

function SearchQuerySync({ enabled, onQuery }: { enabled: boolean; onQuery: (q: string) => void }) {
  const searchParams = useSearchParams();
  const q = enabled ? (searchParams.get("q") ?? "") : "";
  const lastAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (q) {
      lastAppliedRef.current = q;
      onQuery(q);
    } else if (lastAppliedRef.current !== null) {
      lastAppliedRef.current = null;
      onQuery("");
    }
  }, [enabled, q, onQuery]);

  return null;
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
  emptyIllustration,
  rowHref,
  exportName,
  totalCount,
  truncatedAction,
  pageSize = 50,
  index,
}: ModulePageProps) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [tab, setTab] = useState(tabs?.options[0]?.value ?? "all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [addFormVersion, setAddFormVersion] = useState(0);
  const [addDirty, setAddDirty] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editVersion, setEditVersion] = useState(0);
  const [editDirty, setEditDirty] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [flashedRow, setFlashedRow] = useState<{ id: string; tone: "positive" | "accent" } | null>(null);
  const [exportSaved, setExportSaved] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const flashTimer = useRef<number | null>(null);
  const exportTimer = useRef<number | null>(null);

  const flashRow = useCallback((id: string, tone: "positive" | "accent" = "positive") => {
    setFlashedRow({ id, tone });
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashedRow(null), 1150);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (exportTimer.current) window.clearTimeout(exportTimer.current);
    };
  }, []);

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
      // Future expiry: soonest first. Expired / past dates (like Claims payment date): newest first.
      const key = dateFilter.key;
      const direction = dateRange.mode === "expired" || dateFilter.direction === "past" ? -1 : 1;
      result.sort((a, b) => direction * String(a[key]).localeCompare(String(b[key])));
    }
    return result;
  }, [rows, query, filterValues, tab, tabs, dateFilter, dateRange]);

  // Reset pagination whenever filters/search/rows change
  useEffect(() => {
    setPage(1);
  }, [query, filterValues, tab, dateRange, rows]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pagedRows = useMemo(
    () => visible.slice(startIdx, startIdx + pageSize),
    [visible, startIdx, pageSize],
  );

  function handleExportCsv() {
    if (visible.length === 0 || !exportName) return;
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      let s = String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map((c) => escape(c.label)).join(",");
    const body = visible.map((r) =>
      columns
        .map((c) => {
          const val = r[c.key];
          if (val !== null && val !== undefined && val !== "" && c.type === "chip") {
            return escape(chipFor(String(val)).label);
          }
          return escape(val);
        })
        .join(","),
    );
    const csv = [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securedrive_${exportName}_${todayIST()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exported ${visible.length.toLocaleString("en-IN")} row${visible.length === 1 ? "" : "s"}.`);
    setExportSaved(true);
    if (exportTimer.current) window.clearTimeout(exportTimer.current);
    exportTimer.current = window.setTimeout(() => setExportSaved(false), 1600);
  }

  const isTruncated = Boolean(totalCount && totalCount > rows.length);
  const showFooter = visible.length > 0 && (totalPages > 1 || isTruncated);
  const hasLastCell = Boolean(rowHref) || Boolean(edit) || (rowActions?.length ?? 0) > 0;
  const hasActiveFilters =
    query.trim() !== "" ||
    (Boolean(tabs) && tab !== "all") ||
    Object.values(filterValues).some((v) => v !== "all") ||
    (Boolean(dateFilter) && dateRange.mode !== DEFAULT_DATE_RANGE.mode);

  function clearAllFilters() {
    setQuery("");
    if (tabs) setTab("all");
    setFilterValues({});
    if (dateFilter) setDateRange(DEFAULT_DATE_RANGE);
  }

  return (
    <>
      <Suspense fallback={null}>
        <SearchQuerySync enabled={Boolean(search)} onQuery={setQuery} />
      </Suspense>
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
            {filters.map((filter) => {
              const options = [
                { value: "all", label: filter.label },
                ...filter.options,
              ];
              return (
                <div key={filter.key} className="w-auto min-w-[130px]">
                  <CustomSelect
                    value={filterValues[filter.key] ?? "all"}
                    onChange={(val) => setFilterValues((prev) => ({ ...prev, [filter.key]: val }))}
                    options={options}
                    className="h-10 text-xs font-medium"
                  />
                </div>
              );
            })}
            {dateFilter && (
              <DateRangeFilter
                label={dateFilter.label}
                value={dateRange}
                onChange={setDateRange}
                direction={dateFilter.direction}
              />
            )}
            {exportName && (
              <Button
                variant="secondary"
                onClick={handleExportCsv}
                disabled={visible.length === 0}
                saved={exportSaved}
                savedLabel="Exported"
                className="min-w-[122px]"
              >
                {!exportSaved && <Download size={14} strokeWidth={1.75} aria-hidden="true" />}
                Export CSV
              </Button>
            )}
            {primary && (
              <Button
                onClick={() => {
                  setAddDirty(false);
                  setAddFormVersion((v) => v + 1);
                  setOpen(true);
                }}
              >
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                {primary.label}
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap pb-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-ink-muted",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr
                  key={row.id}
                  aria-busy={busyRowId === row.id}
                  className={cn(
                    "h-14 border-t border-divider transition-[opacity,background-color] hover:bg-accent-soft/40",
                    busyRowId === row.id && "opacity-50",
                    flashedRow?.id === row.id && (flashedRow.tone === "positive" ? "flash-positive" : "flash-accent"),
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
                      {edit && (!edit.showWhen || edit.showWhen.in.includes(String(row[edit.showWhen.key]))) && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditDirty(false);
                            setEditVersion((v) => v + 1);
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
                          onFlashed={flashRow}
                        />
                      )}
                      {rowHref && (
                        <Link href={`${rowHref}/${row.id}`} className={buttonStyles("ghost", "group/link h-8 px-3 text-xs")}>
                          View
                          <ArrowUpRight
                            size={14}
                            strokeWidth={1.75}
                            className="transition-transform duration-150 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            rows.length > 0 ? (
              <EmptyState
                label="No matches for your current filters"
                hint="Try broadening your search or resetting active filters."
                illustration={<SearchScoutCharacter mood="empty" size="md" />}
                action={
                  hasActiveFilters ? (
                    <Button variant="secondary" onClick={clearAllFilters} className="h-8 px-3 text-xs">
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <EmptyState
                label={emptyLabel}
                illustration={emptyIllustration ?? <RelaxedEmptyCharacter />}
              />
            )
          )}
        </div>

        {showFooter && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3 text-xs text-ink-muted">
            <div className="flex flex-wrap items-center gap-2 tabular-nums">
              <span>
                Showing {(startIdx + 1).toLocaleString("en-IN")}–{Math.min(startIdx + pageSize, visible.length).toLocaleString("en-IN")} of{" "}
                {visible.length.toLocaleString("en-IN")}
              </span>
              {isTruncated && totalCount && (
                <>
                  <span className="text-ink-faint">
                    (latest {rows.length.toLocaleString("en-IN")} loaded of {totalCount.toLocaleString("en-IN")} total)
                  </span>
                  {truncatedAction && (
                    <Link
                      href={truncatedAction.href}
                      className="font-medium text-ink underline underline-offset-2 hover:text-ink-muted"
                    >
                      {truncatedAction.label}
                    </Link>
                  )}
                </>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="h-8 px-3 text-xs"
                >
                  <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                  Previous
                </Button>
                <span className="px-1 tabular-nums text-ink">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="h-8 px-3 text-xs"
                >
                  Next
                  <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {primary && (
        <Drawer
          open={open}
          title={primary.drawerTitle}
          dirty={addDirty}
          onClose={() => {
            setAddDirty(false);
            setOpen(false);
          }}
        >
          <PrimaryForm
            key={addFormVersion}
            primary={primary}
            initialValues={primary.defaultValues}
            onDirtyChange={setAddDirty}
            onClose={() => {
              setAddDirty(false);
              setOpen(false);
            }}
          />
        </Drawer>
      )}

      {edit && (
        <Drawer
          open={editOpen}
          title={edit.drawerTitle}
          dirty={editDirty}
          onClose={() => {
            setEditDirty(false);
            setEditOpen(false);
          }}
        >
          {editing && (
            <EditForm
              key={`${editing.id}:${editVersion}`}
              edit={edit}
              row={editing}
              onDirtyChange={setEditDirty}
              onSaved={() => flashRow(editing.id, "accent")}
              onClose={() => {
                setEditDirty(false);
                setEditOpen(false);
              }}
            />
          )}
        </Drawer>
      )}
    </>
  );
}
