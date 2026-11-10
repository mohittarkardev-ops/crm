"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Plus, Search, X } from "lucide-react";
import { InsurerLogo } from "@/components/ui/insurer-logo";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Optional logo URL (or monogram badge when `showBadge` is true) rendered beside the option label. */
  logoUrl?: string | null;
  showBadge?: boolean;
};

export interface CustomSelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  onChange?: (value: string) => void;
  /** Called after React commits the new value to the hidden form input (for FormData / conditional fields). */
  onValueChange?: (value: string) => void;
}

const POPOVER_MAX_HEIGHT = 260;

/**
 * Custom Theme-Aligned Dropdown Component (design.md compliant).
 * 
 * - Neutral grey canvas, yellow accent active states, 6px control radius, 8px panel radius.
 * - Clean, sleek, uncluttered presentation (no verbose explanations).
 * - Reliable live type-to-search (instant filtering in search input).
 * - Instant typeahead key jumping (typing characters navigates and highlights).
 * - Full WCAG keyboard navigation (ArrowUp, ArrowDown, Enter, Escape, Home, End).
 * - Portal-rendered to prevent clipping in drawers, cards, or overflow containers.
 */
export function CustomSelect({
  name,
  value: propValue,
  defaultValue = "",
  options,
  placeholder = "Select an option...",
  searchable,
  clearable = false,
  disabled = false,
  invalid = false,
  className,
  onChange,
  onValueChange,
}: CustomSelectProps) {
  const isControlled = propValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? propValue : internalValue;

  // Sync internal value when defaultValue changes in uncontrolled mode
  useEffect(() => {
    if (!isControlled) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, isControlled]);

  // Notify form listeners strictly AFTER the hidden <input> reflects the new value in the DOM.
  const prevCommittedRef = useRef(selectedValue);
  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);
  useEffect(() => {
    if (prevCommittedRef.current === selectedValue) return;
    prevCommittedRef.current = selectedValue;
    onValueChangeRef.current?.(selectedValue);
  }, [selectedValue]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [pos, setPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
  } | null>(null);

  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Respect native <form>.reset() calls in uncontrolled mode.
  useEffect(() => {
    if (isControlled) return;
    const form = hiddenInputRef.current?.form;
    if (!form) return;
    const onReset = () => setInternalValue(defaultValue);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled, name]);

  // Typeahead key buffer for quick typing jump
  const typeaheadBuffer = useRef("");
  const typeaheadTimer = useRef<NodeJS.Timeout | null>(null);

  // Enable search filter: explicitly if searchable is passed, or auto when options >= 6
  const showSearch = searchable ?? options.length >= 6;

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.hint && opt.hint.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  // Selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === selectedValue),
    [options, selectedValue]
  );

  // Position the floating menu container relative to trigger
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow;
    const panelWidth = Math.max(rect.width, 200);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);

    setPos(
      openAbove
        ? { left, bottom: window.innerHeight - rect.top + 6, width: rect.width }
        : { left, top: rect.bottom + 6, width: rect.width }
    );
  }, []);

  useLayoutEffect(() => {
    if (isOpen) place();
  }, [isOpen, place]);

  // Click-outside and resize/scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen, place]);

  // On Open: initialize selection highlight & focus search input ONCE
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      const initialIdx = options.findIndex((opt) => opt.value === selectedValue);
      setHighlightedIndex(initialIdx >= 0 ? initialIdx : 0);

      if (showSearch) {
        // Single delayed focus when portal mounts
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 20);
        return () => clearTimeout(timer);
      }
    } else {
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
  }, [isOpen, showSearch]); // Only run on open/close transitions!

  // Select an option
  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      onChange?.(option.value);
      setIsOpen(false);
      triggerRef.current?.focus();
    },
    [isControlled, onChange]
  );

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isControlled) {
      setInternalValue("");
    }
    onChange?.("");
    triggerRef.current?.focus();
  };

  // Instant Typeahead handler for keyboard matching
  const handleTypeahead = useCallback(
    (char: string) => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadBuffer.current += char.toLowerCase();
      typeaheadTimer.current = setTimeout(() => {
        typeaheadBuffer.current = "";
      }, 700);

      const q = typeaheadBuffer.current;
      // 1. Try prefix match on label
      let matchIdx = filteredOptions.findIndex(
        (opt) => !opt.disabled && opt.label.toLowerCase().startsWith(q)
      );
      // 2. Fallback: prefix match on value
      if (matchIdx < 0) {
        matchIdx = filteredOptions.findIndex(
          (opt) => !opt.disabled && opt.value.toLowerCase().startsWith(q)
        );
      }
      // 3. Fallback: substring match on label
      if (matchIdx < 0) {
        matchIdx = filteredOptions.findIndex(
          (opt) => !opt.disabled && opt.label.toLowerCase().includes(q)
        );
      }

      if (matchIdx >= 0) {
        setHighlightedIndex(matchIdx);
        const opt = filteredOptions[matchIdx];
        if (!isOpen && opt) {
          // If closed, typing directly updates the selection (like native HTML select)
          if (!isControlled) setInternalValue(opt.value);
          onChange?.(opt.value);
        }
      }
    },
    [filteredOptions, isControlled, isOpen, onChange]
  );

  // Keyboard navigation on trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      // Typeahead when closed
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleTypeahead(e.key);
      }
      return;
    }

    // When dropdown is OPEN
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "ArrowDown": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < filteredOptions.length && filteredOptions[next]?.disabled) {
            next++;
          }
          return next < filteredOptions.length ? next : prev;
        });
        break;
      }

      case "ArrowUp": {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && filteredOptions[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : 0;
        });
        break;
      }

      case "Home":
        e.preventDefault();
        setHighlightedIndex(0);
        break;

      case "End":
        e.preventDefault();
        setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
        break;

      case "Enter":
      case " ": {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (opt && !opt.disabled) {
            handleSelect(opt);
          }
        }
        break;
      }

      case "Tab":
        setIsOpen(false);
        break;

      default:
        // Handle typeahead jump when search input is not active
        if (!showSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          handleTypeahead(e.key);
        }
        break;
    }
  };

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < filteredOptions.length && filteredOptions[next]?.disabled) {
            next++;
          }
          return next < filteredOptions.length ? next : prev;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && filteredOptions[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : 0;
        });
        break;

      case "Enter": {
        e.preventDefault();
        if (filteredOptions.length > 0) {
          const targetIndex =
            highlightedIndex >= 0 && highlightedIndex < filteredOptions.length
              ? highlightedIndex
              : 0;
          const opt = filteredOptions[targetIndex];
          if (opt && !opt.disabled) {
            handleSelect(opt);
          }
        }
        break;
      }

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, highlightedIndex]);

  const hasHeight = className ? /\bh-\S+/.test(className) : false;
  const hasWidth = className ? /\bw-\S+/.test(className) : false;

  return (
    <>
      {name && <input ref={hiddenInputRef} type="hidden" name={name} value={selectedValue} />}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={invalid}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "group relative flex items-center justify-between gap-2.5 rounded-control border bg-white px-3 text-left text-sm outline-none transition-all duration-150 active:scale-[0.995]",
          !hasHeight && "h-10",
          !hasWidth && "w-full",
          invalid
            ? "border-negative ring-1 ring-negative/30 bg-negative-soft/10 focus:border-negative"
            : isOpen
            ? "border-accent-strong ring-2 ring-accent-strong/20 bg-white"
            : "border-divider hover:border-ink/40 hover:bg-white focus-visible:border-accent-strong focus-visible:ring-2 focus-visible:ring-accent-strong/20",
          disabled && "cursor-not-allowed opacity-50 bg-surface-muted select-none",
          className
        )}
      >
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 font-normal select-none transition-colors",
            selectedOption ? "text-ink font-medium" : "text-ink-faint",
          )}
        >
          {selectedOption &&
            (selectedOption.value === "__other__" ? (
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center rounded-[4px] border border-dashed border-ink-faint text-ink-muted"
              >
                <Plus size={12} strokeWidth={2} />
              </span>
            ) : selectedOption.logoUrl || selectedOption.showBadge ? (
              <InsurerLogo name={selectedOption.label} logoUrl={selectedOption.logoUrl} size="sm" />
            ) : null)}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>

        <div className="flex items-center gap-1.5 shrink-0 text-ink-muted">
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear selection"
              className="p-0.5 rounded-xs hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
            >
              <X size={14} />
            </span>
          )}

          <ChevronDown
            size={16}
            strokeWidth={2}
            className={cn(
              "transition-transform duration-200",
              isOpen ? "rotate-180 text-ink" : "text-ink-muted group-hover:text-ink"
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleTriggerKeyDown}
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              minWidth: 200,
              maxWidth: "calc(100vw - 16px)",
            }}
            className="pop-in z-[80] rounded-tile bg-surface-strong border border-divider shadow-card-hover overflow-hidden flex flex-col focus:outline-none"
          >
            {/* Live Search Input (for searchable or 6+ items) */}
            {showSearch && (
              <div className="p-2 border-b border-divider bg-surface-muted/30">
                <div className="relative flex items-center">
                  <Search
                    size={14}
                    className="absolute left-2.5 text-ink-muted pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Type to search..."
                    className="w-full h-8 pl-8 pr-7 text-xs rounded-control border border-divider bg-white text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong focus:ring-1 focus:ring-accent-strong transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setHighlightedIndex(0);
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 text-ink-muted hover:text-ink p-0.5 rounded-xs"
                      aria-label="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div
              ref={listRef}
              className="max-h-56 overflow-y-auto p-1 space-y-0.5 select-none focus:outline-none"
            >
              {filteredOptions.length === 0 ? (
                <div className="py-4 px-3 text-center text-xs text-ink-muted space-y-2.5">
                  <div>
                    <p className="font-medium">No results found</p>
                    {searchQuery && (
                      <p className="mt-0.5 text-[11px] text-ink-faint truncate px-2">
                        for &ldquo;{searchQuery}&rdquo;
                      </p>
                    )}
                  </div>
                  {(() => {
                    const otherOpt = options.find((o) => o.value === "__other__" && !o.disabled);
                    if (!otherOpt) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => handleSelect(otherOpt)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-control border border-divider bg-surface-muted/60 px-3 text-xs font-medium text-ink transition-colors hover:bg-accent-soft"
                      >
                        <Plus size={13} strokeWidth={2} />
                        {otherOpt.label}
                      </button>
                    );
                  })()}
                </div>
              ) : (
                filteredOptions.map((option, idx) => {
                  const isSelected = option.value === selectedValue;
                  const isHighlighted = idx === highlightedIndex;
                  const isOtherOption = option.value === "__other__";

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2.5 px-3 py-2 rounded-[4px] text-left text-xs transition-colors cursor-pointer",
                        isOtherOption && idx > 0 && !searchQuery.trim() && "mt-1 border-t border-divider/60 pt-2.5",
                        option.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                        isSelected
                          ? "bg-accent-soft text-ink font-semibold"
                          : isHighlighted
                          ? "bg-surface-muted text-ink"
                          : "text-ink hover:bg-surface-muted/60"
                      )}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {isOtherOption ? (
                          <span
                            aria-hidden="true"
                            className="grid size-5 shrink-0 place-items-center rounded-[4px] border border-dashed border-ink-faint text-ink-muted"
                          >
                            <Plus size={12} strokeWidth={2} />
                          </span>
                        ) : option.logoUrl || option.showBadge ? (
                          <InsurerLogo name={option.label} logoUrl={option.logoUrl} size="sm" />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{option.label}</span>
                          {option.hint && (
                            <span className="block truncate text-[11px] font-normal text-ink-faint">
                              {option.hint}
                            </span>
                          )}
                        </span>
                      </span>

                      {isSelected && (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="shrink-0 text-ink"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
