"use client";

import React, { useState, useEffect } from "react";
import {
  Filter,
  ChevronDown,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDown10,
  ArrowUp10,
  CalendarDays,
  Hash,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/cn";
import type { SortDir, SortField } from "@/lib/data/data-grid";

export type HeaderFilterType =
  | "contains"
  | "starts_with"
  | "exact"
  | "in_array"
  | "date_range"
  | "number_range";

export interface SmartHeaderProps {
  label: string;
  fieldKey: string;
  isCustom?: boolean;
  filterType?: HeaderFilterType;
  options?: string[]; // for in_array
  openHeaderMenu: string | null;
  setOpenHeaderMenu: (val: string | null) => void;
  columnFilters: Record<string, any>;
  onApplyFilter: (field: string, filterData: any | null) => void;
  sortConfig: { field: SortField | string; direction: SortDir; isCustom: boolean } | null;
  onSort: (field: SortField | string, direction: SortDir, isCustom: boolean) => void;
}

export function SmartHeader({
  label,
  fieldKey,
  isCustom = false,
  filterType = "contains",
  options = [],
  openHeaderMenu,
  setOpenHeaderMenu,
  columnFilters,
  onApplyFilter,
  sortConfig,
  onSort,
}: SmartHeaderProps) {
  const isMenuOpen = openHeaderMenu === fieldKey;
  const currentFilterData = columnFilters[fieldKey];
  const isSorted = sortConfig?.field === fieldKey;
  const isFiltered = Boolean(currentFilterData);

  // Local state for the filter menu
  const [tempText, setTempText] = useState<string>("");
  const [tempArray, setTempArray] = useState<Set<string>>(new Set());
  const [tempDate, setTempDate] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [tempNumber, setTempNumber] = useState<{ min: string; max: string }>({ min: "", max: "" });

  useEffect(() => {
    if (isMenuOpen) {
      if (currentFilterData) {
        if (["contains", "starts_with", "exact"].includes(filterType)) {
          setTempText(typeof currentFilterData.value === "string" ? currentFilterData.value : "");
        } else if (filterType === "in_array" && Array.isArray(currentFilterData.value)) {
          setTempArray(new Set(currentFilterData.value));
        } else if (filterType === "date_range" && typeof currentFilterData.value === "object") {
          setTempDate(currentFilterData.value ?? { start: "", end: "" });
        } else if (filterType === "number_range" && typeof currentFilterData.value === "object") {
          setTempNumber(currentFilterData.value ?? { min: "", max: "" });
        }
      } else {
        setTempText("");
        setTempArray(new Set());
        setTempDate({ start: "", end: "" });
        setTempNumber({ min: "", max: "" });
      }
    }
  }, [isMenuOpen, currentFilterData, filterType]);

  const handleSortClick = (direction: SortDir) => {
    onSort(fieldKey, direction, isCustom);
    setOpenHeaderMenu(null);
  };

  const handleApply = () => {
    let hasValue = false;
    let payload: any = { type: filterType, value: null };

    if (filterType === "in_array") {
      if (tempArray.size > 0) {
        payload.value = Array.from(tempArray);
        hasValue = true;
      }
    } else if (filterType === "date_range") {
      if (tempDate.start || tempDate.end) {
        payload.value = tempDate;
        hasValue = true;
      }
    } else if (filterType === "number_range") {
      if (tempNumber.min || tempNumber.max) {
        payload.value = tempNumber;
        hasValue = true;
      }
    } else {
      if (tempText.trim()) {
        payload.value = tempText.trim();
        hasValue = true;
      }
    }

    if (hasValue) {
      onApplyFilter(fieldKey, payload);
    } else {
      onApplyFilter(fieldKey, null);
    }
    setOpenHeaderMenu(null);
  };

  const handleClear = () => {
    setTempText("");
    setTempArray(new Set());
    setTempDate({ start: "", end: "" });
    setTempNumber({ min: "", max: "" });
    onApplyFilter(fieldKey, null);
    setOpenHeaderMenu(null);
  };

  const renderSortIcons = () => {
    if (filterType === "number_range") {
      return {
        asc: <ArrowDown10 size={14} />,
        desc: <ArrowUp10 size={14} />,
        labelAsc: "Smallest to Largest",
        labelDesc: "Largest to Smallest",
      };
    }
    if (filterType === "date_range") {
      return {
        asc: <CalendarDays size={14} />,
        desc: <CalendarDays size={14} />,
        labelAsc: "Oldest to Newest",
        labelDesc: "Newest to Oldest",
      };
    }
    return {
      asc: <ArrowDownAZ size={14} />,
      desc: <ArrowDownZA size={14} />,
      labelAsc: "Sort A to Z",
      labelDesc: "Sort Z to A",
    };
  };

  const sortUI = renderSortIcons();

  return (
    <th className="relative px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-ink-muted uppercase border-b border-divider select-none bg-surface-muted/95 backdrop-blur whitespace-nowrap header-menu-container">
      <div
        onClick={() => setOpenHeaderMenu(isMenuOpen ? null : fieldKey)}
        className="inline-flex items-center gap-1.5 cursor-pointer hover:text-ink transition-colors group"
      >
        <span>{label}</span>
        <div className="flex items-center gap-0.5 text-ink-faint">
          {isSorted && (
            <span className="text-ink">
              {sortConfig?.direction === "asc" ? sortUI.asc : sortUI.desc}
            </span>
          )}
          {isFiltered && (
            <span className="text-accent-strong">
              <Filter size={11} className="fill-accent text-ink" />
            </span>
          )}
          {!isSorted && !isFiltered && (
            <ChevronDown size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-tile border border-divider bg-surface-strong p-3 shadow-card-hover text-xs normal-case tracking-normal font-sans text-ink">
          {/* Sorting */}
          <div className="space-y-1 pb-2 mb-2 border-b border-divider">
            <button
              type="button"
              onClick={() => handleSortClick("asc")}
              className={cn(
                "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left transition-colors",
                isSorted && sortConfig?.direction === "asc"
                  ? "bg-accent-soft font-semibold text-ink"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              )}
            >
              {sortUI.asc} {sortUI.labelAsc}
            </button>
            <button
              type="button"
              onClick={() => handleSortClick("desc")}
              className={cn(
                "flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left transition-colors",
                isSorted && sortConfig?.direction === "desc"
                  ? "bg-accent-soft font-semibold text-ink"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              )}
            >
              {sortUI.desc} {sortUI.labelDesc}
            </button>
          </div>

          {/* Filtering */}
          <div>
            <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
              Filter
            </div>

            {/* Text filter */}
            {["contains", "starts_with", "exact"].includes(filterType) && (
              <input
                type="text"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder={`Search ${label}...`}
                className="w-full rounded-control border border-divider bg-surface-strong px-2.5 py-1.5 text-xs text-ink outline-none focus:border-ink transition-colors mb-3"
                autoFocus
              />
            )}

            {/* Enums */}
            {filterType === "in_array" && (
              <div className="max-h-36 overflow-y-auto mb-3 space-y-1.5 pr-1">
                {options.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-ink-muted hover:text-ink">
                    <input
                      type="checkbox"
                      checked={tempArray.has(opt)}
                      onChange={() => {
                        const next = new Set(tempArray);
                        if (next.has(opt)) next.delete(opt);
                        else next.add(opt);
                        setTempArray(next);
                      }}
                      className="rounded border-divider text-ink focus:ring-0 accent-[var(--text)]"
                    />
                    <span className="capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Date ranges */}
            {filterType === "date_range" && (
              <div className="space-y-2 mb-3">
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-ink-muted mb-0.5">From</span>
                  <DatePicker
                    value={tempDate.start}
                    onChange={(val) => setTempDate((prev) => ({ ...prev, start: val }))}
                    placeholder="Start date"
                    className="h-8 px-2 text-xs"
                  />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-ink-muted mb-0.5">To</span>
                  <DatePicker
                    value={tempDate.end}
                    onChange={(val) => setTempDate((prev) => ({ ...prev, end: val }))}
                    placeholder="End date"
                    className="h-8 px-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Number ranges */}
            {filterType === "number_range" && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-ink-muted mb-0.5">Min</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={tempNumber.min}
                    onChange={(e) => setTempNumber({ ...tempNumber, min: e.target.value })}
                    className="w-full rounded-control border border-divider bg-surface-strong px-2 py-1 text-xs text-ink outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-semibold text-ink-muted mb-0.5">Max</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={tempNumber.max}
                    onChange={(e) => setTempNumber({ ...tempNumber, max: e.target.value })}
                    className="w-full rounded-control border border-divider bg-surface-strong px-2 py-1 text-xs text-ink outline-none focus:border-ink"
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 rounded-control border border-divider bg-surface-strong py-1 text-center font-medium text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 rounded-control bg-ink py-1 text-center font-medium text-white hover:bg-ink/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </th>
  );
}
