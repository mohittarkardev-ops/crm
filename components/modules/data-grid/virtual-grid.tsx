"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  TableProperties,
  RotateCcw,
  Check,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { CONTROL } from "@/components/ui/field";
import { SmartHeader } from "./smart-header";
import { InlineCell } from "./inline-cell";
import {
  type CustomField,
  type GridFilter,
  type GridRow,
  type SortDir,
  type SortField,
} from "@/lib/data/data-grid";
import { exportGridCsv, fetchGridPage } from "@/lib/actions/data-grid";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

interface VirtualGridProps {
  initialRows: GridRow[];
  initialCursor: { dueDate: string | null; id: string } | null;
  initialTotal: number;
  customFields: CustomField[];
  canEdit: boolean;
  canExport: boolean;
}

export function VirtualGrid({
  initialRows,
  initialCursor,
  initialTotal,
  customFields,
  canEdit,
  canExport,
}: VirtualGridProps) {
  const [rows, setRows] = useState<GridRow[]>(initialRows);
  const [nextCursor, setNextCursor] = useState<{ dueDate: string | null; id: string } | null>(
    initialCursor
  );
  const [totalCount, setTotalCount] = useState<number>(initialTotal);

  // Global search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sort & Filters
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | string;
    direction: SortDir;
    isCustom: boolean;
  } | null>({ field: "due_date", direction: "asc", isCustom: false });
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [openHeaderMenu, setOpenHeaderMenu] = useState<string | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Loading states
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<"csv" | "excel" | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close header menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        target.closest(".header-menu-container") ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="listbox"]') ||
        target.closest(".pop-in")
      ) {
        return;
      }
      setOpenHeaderMenu(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build filters array for server action
  const serializeFilters = useCallback((): GridFilter[] => {
    const result: GridFilter[] = [];
    for (const [field, f] of Object.entries(columnFilters)) {
      if (f && f.value != null) {
        result.push({
          field,
          type: f.type,
          value: f.value,
        });
      }
    }
    return result;
  }, [columnFilters]);

  // Reload rows when search, sort, or filters change
  const reloadGrid = useCallback(async () => {
    startSearchTransition(async () => {
      try {
        const filters = serializeFilters();
        const res = await fetchGridPage({
          search: debouncedSearch,
          sortField: sortConfig?.field as SortField,
          sortDir: sortConfig?.direction,
          filters,
          cursor: null,
        });
        setRows(res.rows);
        setNextCursor(res.nextCursor);
        setTotalCount(res.totalCount);
        setSelectedIds(new Set());
      } catch (err) {
        console.error("Failed to reload data grid:", err);
      }
    });
  }, [debouncedSearch, sortConfig, serializeFilters]);

  // Trigger reload on search, sort, or filter change
  useEffect(() => {
    void reloadGrid();
  }, [debouncedSearch, sortConfig, columnFilters, reloadGrid]);

  // Load next page
  const loadNextPage = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const filters = serializeFilters();
      const res = await fetchGridPage({
        search: debouncedSearch,
        sortField: sortConfig?.field as SortField,
        sortDir: sortConfig?.direction,
        filters,
        cursor: nextCursor,
      });
      setRows((prev) => [...prev, ...res.rows]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error("Failed to load more rows:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, debouncedSearch, sortConfig, serializeFilters]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: nextCursor ? rows.length + 1 : rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 44, // Row height ~44px
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Trigger next page when scrolling near the bottom
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= rows.length - 1 && nextCursor !== null && !loadingMore) {
      void loadNextPage();
    }
  }, [virtualItems, rows.length, nextCursor, loadingMore, loadNextPage]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  };

  // Sorting and filtering callbacks for SmartHeader
  const handleSort = (field: SortField | string, direction: SortDir, isCustom: boolean) => {
    setSortConfig({ field, direction, isCustom });
  };

  const handleApplyFilter = (field: string, filterData: any | null) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (filterData) next[field] = filterData;
      else delete next[field];
      return next;
    });
  };

  const handleResetFilters = () => {
    setColumnFilters({});
    setSearch("");
    setSortConfig({ field: "due_date", direction: "asc", isCustom: false });
  };

  // Inline edit save local update
  const handleCellSaved = (id: string, field: string, newValue: string, isCustom: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (isCustom) {
          return {
            ...r,
            customData: { ...r.customData, [field]: newValue },
          };
        }
        // Map editable field to GridRow property
        const mapping: Record<string, keyof GridRow> = {
          owner_name: "ownerName",
          vehicle_reg_no: "vehicleRegNo",
          holder_mobile: "holderMobile",
          vehicle_make: "vehicleMake",
          vehicle_model: "vehicleModel",
          insurer_name: "insurer",
          policy_number: "policyNumber",
          idv: "idv",
          saod_due_date: "saodDueDate",
          tp_due_date: "tpDueDate",
        };
        const prop = mapping[field];
        if (!prop) return r;
        return {
          ...r,
          [prop]: field === "idv" ? (newValue ? Number(newValue) : null) : newValue || null,
        };
      })
    );
  };

  // Export CSV
  const handleExportCsv = async () => {
    if (!canExport) return;
    setIsExporting("csv");
    try {
      const filters = serializeFilters();
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await exportGridCsv({
        search: debouncedSearch,
        filters,
        ids,
      });

      if (!res.ok) {
        toast(res.error, "error");
        return;
      }

      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `securedrive_policies_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast("CSV export complete.");
    } catch (err) {
      console.error("Export error:", err);
      toast("Failed to export data.", "error");
    } finally {
      setIsExporting(null);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!canExport) return;
    setIsExporting("excel");
    try {
      // First get CSV data from server
      const filters = serializeFilters();
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await exportGridCsv({
        search: debouncedSearch,
        filters,
        ids,
      });

      if (!res.ok) {
        toast(res.error, "error");
        return;
      }

      // Convert CSV to XLSX using xlsx library dynamically
      let XLSXModule: any = null;
      try {
        XLSXModule = await import("xlsx");
      } catch {
        // Fallback to CSV if xlsx is not available
        console.warn("xlsx module not available, falling back to CSV download");
      }

      if (XLSXModule && XLSXModule.read && XLSXModule.writeFile) {
        const workbook = XLSXModule.read(res.csv, { type: "string" });
        XLSXModule.writeFile(
          workbook,
          `securedrive_policies_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
      } else {
        // Direct download as CSV
        const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `securedrive_policies_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast("Excel export complete.");
    } catch (err) {
      console.error("Export error:", err);
      toast("Failed to export Excel.", "error");
    } finally {
      setIsExporting(null);
    }
  };

  const headerProps = {
    openHeaderMenu,
    setOpenHeaderMenu,
    columnFilters,
    onApplyFilter: handleApplyFilter,
    sortConfig,
    onSort: handleSort,
  };

  const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end || 0)
      : 0;

  const hasActiveFilters = Object.keys(columnFilters).length > 0 || search.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reg no, owner, mobile, policy no..."
              className={cn(CONTROL, "h-10 pl-9 pr-9 text-xs")}
            />
            {isSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
                <Spinner size={14} />
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="h-8 px-3 text-xs text-ink-muted hover:text-ink"
              >
                <RotateCcw size={14} className="mr-1.5" />
                Reset filters
              </Button>
            )}

            {canExport && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleExportCsv}
                  loading={isExporting === "csv"}
                  disabled={isExporting !== null}
                  className="h-8 px-3 text-xs"
                >
                  <Download size={14} className="mr-1.5" />
                  {selectedIds.size > 0 ? `CSV (${selectedIds.size})` : "Export CSV"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportExcel}
                  loading={isExporting === "excel"}
                  disabled={isExporting !== null}
                  className="h-8 px-3 text-xs"
                >
                  <FileSpreadsheet size={14} className="mr-1.5" />
                  {selectedIds.size > 0 ? `Excel (${selectedIds.size})` : "Export Excel"}
                </Button>
              </>
            )}

            <Link
              href="/policies"
              className={buttonStyles("secondary", "h-8 px-3 text-xs inline-flex items-center")}
            >
              <FileText size={14} className="mr-1.5" />
              Policies List
            </Link>
          </div>
        </div>

        {/* Info rule: selection and count */}
        <div className="mt-3 flex items-center justify-between border-t border-divider pt-2 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">
              {rows.length.toLocaleString("en-IN")} loaded
            </span>
            <span>of {totalCount.toLocaleString("en-IN")} total</span>
            {selectedIds.size > 0 && (
              <Chip tone="accent">
                {selectedIds.size} selected
              </Chip>
            )}
          </div>
          <div className="text-[11px] text-ink-faint">
            {canEdit ? "Click any cell to edit inline" : "Read-only power view"}
          </div>
        </div>
      </Card>

      {/* Virtual Table Card */}
      <div className="rounded-card border border-divider bg-surface shadow-card overflow-hidden">
        <div
          ref={containerRef}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] min-h-[400px] select-text"
        >
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-20 border-b border-divider bg-surface-muted/95 backdrop-blur">
              <tr>
                {/* Select All Checkbox */}
                <th className="w-10 px-3 py-2.5 text-center border-b border-divider bg-surface/90">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === rows.length && rows.length > 0}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all"
                    className="rounded border-divider text-ink focus:ring-0 cursor-pointer accent-[var(--text)]"
                  />
                </th>

                {/* Fixed standard headers */}
                <SmartHeader
                  label="Reg No."
                  fieldKey="vehicle_reg_no"
                  filterType="starts_with"
                  {...headerProps}
                />
                <SmartHeader
                  label="Type"
                  fieldKey="vehicle_category"
                  filterType="in_array"
                  options={["2W", "4W", "CV"]}
                  {...headerProps}
                />
                <SmartHeader
                  label="Owner Name"
                  fieldKey="owner_name"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="Contact"
                  fieldKey="holder_mobile"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="Make"
                  fieldKey="vehicle_make"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="Model"
                  fieldKey="vehicle_model"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="Insurer"
                  fieldKey="insurer_name"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="Policy No."
                  fieldKey="policy_number"
                  filterType="contains"
                  {...headerProps}
                />
                <SmartHeader
                  label="IDV (₹)"
                  fieldKey="idv"
                  filterType="number_range"
                  {...headerProps}
                />
                <SmartHeader
                  label="SAOD Due"
                  fieldKey="saod_due_date"
                  filterType="date_range"
                  {...headerProps}
                />
                <SmartHeader
                  label="TP Due"
                  fieldKey="tp_due_date"
                  filterType="date_range"
                  {...headerProps}
                />
                <SmartHeader
                  label="Due Date"
                  fieldKey="due_date"
                  filterType="date_range"
                  {...headerProps}
                />
                <SmartHeader
                  label="Source"
                  fieldKey="source"
                  filterType="in_array"
                  options={["advisor_added", "user_added"]}
                  {...headerProps}
                />

                {/* Dynamic custom columns */}
                {customFields.map((col) => (
                  <SmartHeader
                    key={col.accessorKey}
                    label={col.headerLabel}
                    fieldKey={col.accessorKey}
                    isCustom={true}
                    filterType={
                      col.dataType === "date"
                        ? "date_range"
                        : col.dataType === "number"
                        ? "number_range"
                        : col.dataType === "enum"
                        ? "in_array"
                        : "contains"
                    }
                    options={col.enumOptions}
                    {...headerProps}
                  />
                ))}

                <SmartHeader
                  label="Status"
                  fieldKey="status"
                  filterType="in_array"
                  options={["Active", "Expiring Soon", "Expired"]}
                  {...headerProps}
                />

                {/* Actions column */}
                <th className="sticky right-0 z-30 px-3 py-2.5 text-right text-[10px] font-semibold tracking-wider text-ink-muted uppercase border-b border-l border-divider bg-surface-muted/95 backdrop-blur">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-divider/60">
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} />
                </tr>
              )}

              {virtualItems.map((virtualRow) => {
                const isLoaderRow = virtualRow.index > rows.length - 1;
                const record = rows[virtualRow.index];

                if (isLoaderRow) {
                  return (
                    <tr key="loader-row" className="bg-surface-muted/30">
                      <td
                        colSpan={16 + customFields.length}
                        className="py-4 text-center text-xs text-ink-muted"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Spinner size={14} />
                          <span>Loading more records from database...</span>
                        </div>
                      </td>
                    </tr>
                  );
                }

                if (!record) return null;

                const isSelected = selectedIds.has(record.id);

                return (
                  <tr
                    key={record.id}
                    className={cn(
                      "transition-colors hover:bg-accent-soft/40 group",
                      isSelected ? "bg-accent-soft/30" : "bg-surface"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(record.id)}
                        aria-label={`Select ${record.vehicleRegNo || record.id}`}
                        className="rounded border-divider text-ink focus:ring-0 cursor-pointer accent-[var(--text)]"
                      />
                    </td>

                    {/* Reg No */}
                    <td className="px-3 py-2 font-semibold text-ink">
                      <InlineCell
                        policyId={record.id}
                        field="vehicle_reg_no"
                        value={record.vehicleRegNo}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Category */}
                    <td className="px-3 py-2">
                      {record.vehicleCategory ? (
                        <span className="inline-block rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink">
                          {record.vehicleCategory}
                        </span>
                      ) : (
                        <span className="text-ink-faint text-[10px]">—</span>
                      )}
                    </td>

                    {/* Owner Name */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="owner_name"
                        value={record.ownerName}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Contact Mobile */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="holder_mobile"
                        value={record.holderMobile}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Make */}
                    <td className="px-3 py-2 text-ink-muted">
                      <InlineCell
                        policyId={record.id}
                        field="vehicle_make"
                        value={record.vehicleMake}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Model */}
                    <td className="px-3 py-2 text-ink-muted">
                      <InlineCell
                        policyId={record.id}
                        field="vehicle_model"
                        value={record.vehicleModel}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Insurer */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="insurer_name"
                        value={record.insurer}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Policy No */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="policy_number"
                        value={record.policyNumber}
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* IDV */}
                    <td className="px-3 py-2 text-right">
                      <InlineCell
                        policyId={record.id}
                        field="idv"
                        value={record.idv}
                        inputType="number"
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* SAOD Due */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="saod_due_date"
                        value={record.saodDueDate}
                        inputType="date"
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* TP Due */}
                    <td className="px-3 py-2">
                      <InlineCell
                        policyId={record.id}
                        field="tp_due_date"
                        value={record.tpDueDate}
                        inputType="date"
                        canEdit={canEdit}
                        onSaved={(f, v) => handleCellSaved(record.id, f, v, false)}
                      />
                    </td>

                    {/* Due Date (read-only driver) */}
                    <td className="px-3 py-2 font-medium text-ink">
                      {record.dueDate ? (
                        <span className="tabular-nums">{formatDate(record.dueDate)}</span>
                      ) : (
                        <span className="text-ink-faint text-[10px]">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-medium text-ink-muted">
                        {record.source === "advisor_added" ? "Advisor" : "Client"}
                      </span>
                    </td>

                    {/* Dynamic custom columns */}
                    {customFields.map((col) => (
                      <td key={col.accessorKey} className="px-3 py-2 bg-surface-muted/15">
                        <InlineCell
                          policyId={record.id}
                          field={col.accessorKey}
                          value={record.customData[col.accessorKey] ?? null}
                          isCustom={true}
                          inputType={
                            col.dataType === "date"
                              ? "date"
                              : col.dataType === "number"
                              ? "number"
                              : "text"
                          }
                          canEdit={canEdit}
                          onSaved={(f, v, c) => handleCellSaved(record.id, f, v, c)}
                        />
                      </td>
                    ))}

                    {/* Status Chip */}
                    <td className="px-3 py-2">
                      <Chip
                        tone={
                          record.status === "Active"
                            ? "positive"
                            : record.status === "Expiring Soon"
                            ? "warning"
                            : "negative"
                        }
                      >
                        {record.status}
                      </Chip>
                    </td>

                    {/* Open Detail Action */}
                    <td className="sticky right-0 px-3 py-2 text-right bg-surface group-hover:bg-accent-soft/20 border-l border-divider">
                      <Link
                        href={`/policies/${record.id}`}
                        title="View policy details"
                        className="inline-flex size-7 items-center justify-center rounded-[4px] text-ink-muted hover:bg-surface-strong hover:text-ink transition-colors"
                      >
                        <ExternalLink size={13} strokeWidth={1.75} />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} />
                </tr>
              )}
            </tbody>
          </table>

          {rows.length === 0 && !isSearching && (
            <div className="py-16 text-center">
              <TableProperties size={28} className="mx-auto mb-2 text-ink-faint" />
              <p className="text-sm font-semibold text-ink">No policies match the criteria</p>
              <p className="text-xs text-ink-muted mt-1">
                Try clearing search terms or removing column filters.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  onClick={handleResetFilters}
                  className="mt-4 h-8 px-3 text-xs"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
