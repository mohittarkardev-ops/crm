"use client";

import { cn } from "@/lib/cn";

/**
 * Extended interactive Shield Crew characters crafted for Search, Import/Lookup workflows,
 * contextual Empty States, Reports Blueprints, Error Recovery, Verification, and Push Dispatch.
 * Strictly follows Hudson CSS design tokens (no hard-coded hex colors) and reduced-motion rules.
 */

const SPRING = "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

/* -------------------------------------------------------------------------- */
/* 1. Smart Search Sidekick (GlobalSearch & filtered-empty ModulePage tables) */
/* -------------------------------------------------------------------------- */

export type SearchScoutMood = "idle" | "searching" | "results" | "empty";

export function SearchScoutCharacter({
  mood = "idle",
  glanceY = 0,
  glanceX = 0,
  size = "md",
  className,
}: {
  mood?: SearchScoutMood;
  /** Vertical glance normalized [-1, 1] — moves pupils/head toward highlighted result rows. */
  glanceY?: number;
  glanceX?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const clampedY = Math.max(-1, Math.min(1, glanceY));
  const clampedX = Math.max(-1, Math.min(1, glanceX));

  const isSearching = mood === "searching";
  const isResults = mood === "results";
  const isEmpty = mood === "empty";

  const headTransform = isEmpty
    ? "rotate(-8deg)"
    : isResults
      ? `translateY(${(clampedY * 1.6).toFixed(2)}px) rotate(${(clampedY * 3).toFixed(2)}deg)`
      : "rotate(0deg)";

  const pupilTransform = isResults
    ? `translate(${(clampedX * 2).toFixed(2)}px, ${(clampedY * 2.2).toFixed(2)}px)`
    : isEmpty
      ? "translate(-1px, -1.2px)"
      : "translate(0px, 0px)";

  const lensTransform = isResults
    ? `translateY(${(clampedY * 3.8).toFixed(2)}px)`
    : isEmpty
      ? "translate(2px, 3px) rotate(12deg)"
      : "translate(0px, 0px)";

  const sizeClass =
    size === "xs"
      ? "h-10 w-12"
      : size === "sm"
        ? "h-14 w-[70px]"
        : size === "lg"
          ? "h-28 w-32"
          : "h-20 w-24";

  return (
    <svg
      viewBox="0 0 100 84"
      className={cn("shrink-0 select-none overflow-visible", sizeClass, className)}
      aria-hidden="true"
    >
      <ellipse cx="48" cy="76" rx="30" ry="4" fill="var(--surface-muted)" />
      <circle
        cx="46"
        cy="42"
        r="27"
        fill="var(--accent-soft)"
        opacity={isEmpty ? 0.55 : 0.85}
      />

      {/* Tilting / glancing shield body */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transform: headTransform,
        }}
        className={cn(SPRING, mood === "idle" && "scout-float")}
      >
        <path
          d="M44 15 C57 15 66 20 66 27 V46 C66 60 44 68 44 68 C44 68 22 60 22 46 V27 C22 20 31 15 44 15 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path
          d="M32 22 C36 20.1 40 19.3 44 19.3 C48 19.3 52 20.1 56 22"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.8"
          strokeLinecap="round"
        />

        {/* Expressive eyebrows */}
        {isEmpty ? (
          <>
            <path d="M32 30 Q36 27 40 30" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M48 31.5 Q52 30 56 32" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M32 31 Q36.5 28.8 40.5 31" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M47.5 31 Q51.5 28.8 56 31" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
          </>
        )}

        {/* Blinking eye sockets + smooth live pupil scan / glance */}
        <g className="scout-blink">
          <g
            style={{ transform: isSearching ? undefined : pupilTransform }}
            className={cn(
              !isSearching && "transition-transform duration-150 ease-out",
              isSearching && "scout-pupil-scan",
            )}
          >
            <ellipse cx="36.5" cy="38" rx="2.7" ry="3.2" fill="var(--text)" />
            <circle cx="37.4" cy="36.8" r="1" fill="var(--surface-strong)" />
            <ellipse cx="51.5" cy="38" rx="2.7" ry="3.2" fill="var(--text)" />
            <circle cx="52.4" cy="36.8" r="1" fill="var(--surface-strong)" />
          </g>
        </g>

        <ellipse cx="29.5" cy="43" rx="2.4" ry="1.6" fill="var(--accent-soft)" />
        <ellipse cx="58.5" cy="43" rx="2.4" ry="1.6" fill="var(--accent-soft)" />

        {/* Mood mouth */}
        {isEmpty ? (
          <path d="M40.5 48 Q44 46 47.5 48.2" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
        ) : isSearching ? (
          <circle cx="44" cy="47.5" r="2" fill="var(--text)" />
        ) : (
          <path d="M39.5 46 Q44 50 48.5 46" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Left paw: thoughtful temple touch on empty, relaxed at side otherwise */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "top right",
            transform: isEmpty ? "translate(2px, -12px) rotate(24deg)" : "translate(0px, 0px)",
          }}
          className={SPRING}
        >
          <path d="M22 45 Q15 48 16 54" fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="54.5" r="3.4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.8" />
        </g>
      </g>

      {/* Magnifying glass right-hand prop */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "62px 50px",
          transform: isSearching ? undefined : lensTransform,
        }}
        className={cn(SPRING, isSearching && "scout-lens-scan")}
      >
        <path d="M62 49 L70 43" fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
        <circle
          cx="78"
          cy="35"
          r="13"
          fill="color-mix(in srgb, var(--surface-strong) 62%, var(--accent-soft))"
          stroke="var(--text)"
          strokeWidth="2.4"
        />
        <circle cx="78" cy="35" r="10.2" fill="none" stroke="var(--surface-strong)" strokeWidth="1.2" opacity="0.7" />
        <path d="M71 29 A9 9 0 0 1 82 25" fill="none" stroke="var(--surface-strong)" strokeWidth="2.2" strokeLinecap="round" />
      </g>

      {/* Puzzled question mark bubble on zero matches */}
      {isEmpty && (
        <g className="check-pop">
          <g className="scout-float">
            <circle cx="15" cy="18" r="8.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
            <text x="15" y="21.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--text)">
              ?
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Bulk Import Co-Pilot (ColumnMapper drag, chunk progress, completion)     */
/* -------------------------------------------------------------------------- */

export type ImportCopilotStage = "ready" | "catching" | "mapping" | "uploading" | "done";

export function ImportCopilotCharacter({
  stage = "ready",
  progress = 0,
  hasErrors = false,
  className,
}: {
  stage?: ImportCopilotStage;
  progress?: number;
  hasErrors?: boolean;
  className?: string;
}) {
  const isCatching = stage === "catching";
  const isUploading = stage === "uploading";
  const isDone = stage === "done";
  const isMapping = stage === "mapping";

  const clampedPct = Math.max(0, Math.min(100, progress));
  const check1 = isDone || clampedPct >= 18;
  const check2 = isDone || clampedPct >= 52;
  const check3 = isDone || clampedPct >= 85;

  return (
    <svg
      viewBox="0 0 156 112"
      className={cn("h-24 w-36 shrink-0 select-none overflow-visible sm:h-28 sm:w-40", className)}
      aria-hidden="true"
    >
      <ellipse cx="76" cy="102" rx="48" ry="5.5" fill="var(--surface-muted)" />
      <circle
        cx="74"
        cy="54"
        r="40"
        fill={isDone && !hasErrors ? "var(--positive-soft)" : "var(--accent-soft)"}
        opacity="0.72"
      />

      {/* Hovering spreadsheet sheet waiting to be caught on file drag */}
      {isCatching && (
        <g className="scout-catcher-float">
          <g transform="rotate(-6 74 16)">
            <rect
              x="56"
              y="4"
              width="36"
              height="26"
              rx="4"
              fill="var(--surface-strong)"
              stroke="var(--text)"
              strokeWidth="2"
            />
            <rect x="61" y="9" width="26" height="5" rx="1.5" fill="var(--accent)" />
            <line x1="61" y1="18" x2="86" y2="18" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
            <line x1="61" y1="23" x2="78" y2="23" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* Shield co-pilot body — leans smoothly when catching */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transform: isCatching
            ? "translateY(-4px) scale(1.03)"
            : isUploading
              ? "translateX(-14px)"
              : isDone
                ? "translateX(-12px)"
                : "translateY(0)",
        }}
        className={SPRING}
      >
        {/* Left arm */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "right center",
            transform: isCatching
              ? "translate(4px, -18px) rotate(42deg)"
              : isDone
                ? "translate(2px, -10px) rotate(24deg)"
                : "translate(0px, 0px)",
          }}
          className={SPRING}
        >
          <path d="M51 64 Q40 60 39 50" fill="none" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
          <circle
            cx="39"
            cy="49"
            r="4.2"
            fill={isCatching || isDone ? "var(--accent)" : "var(--surface-strong)"}
            stroke="var(--text)"
            strokeWidth="2"
          />
        </g>

        {/* Right arm */}
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "left center",
            transform: isCatching
              ? "translate(-4px, -18px) rotate(-42deg)"
              : isUploading
                ? "translate(4px, -4px) rotate(-8deg)"
                : "translate(0px, 0px)",
          }}
          className={cn(SPRING, isUploading && "scout-tick")}
        >
          <path d="M97 64 Q108 60 109 50" fill="none" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
          <circle
            cx="109"
            cy="49"
            r="4.2"
            fill={isCatching ? "var(--accent)" : "var(--surface-strong)"}
            stroke="var(--text)"
            strokeWidth="2"
          />
        </g>

        {/* Core Shield Silhouette */}
        <path
          d="M74 28 C89 28 98 34 98 42 V66 C98 83 74 93 74 93 C74 93 50 83 50 66 V42 C50 34 59 28 74 28 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M60 36 C65 33.6 69.5 32.8 74 32.8 C78.5 32.8 83 33.6 88 36"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4.2"
          strokeLinecap="round"
        />

        {/* Eyes + happy expressions */}
        {isDone && !hasErrors ? (
          <>
            <path d="M61 52 Q65 47 69 52" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M79 52 Q83 47 87 52" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <g className="scout-blink">
            <ellipse
              cx="65"
              cy="52"
              rx={isCatching ? 3.4 : 2.8}
              ry={isCatching ? 4 : 3.4}
              fill="var(--text)"
            />
            <circle cx="66" cy="50.6" r="1.1" fill="var(--surface-strong)" />
            <ellipse
              cx="83"
              cy="52"
              rx={isCatching ? 3.4 : 2.8}
              ry={isCatching ? 4 : 3.4}
              fill="var(--text)"
            />
            <circle cx="84" cy="50.6" r="1.1" fill="var(--surface-strong)" />
          </g>
        )}

        <ellipse cx="58" cy="58" rx="2.7" ry="1.8" fill="var(--accent-soft)" />
        <ellipse cx="90" cy="58" rx="2.7" ry="1.8" fill="var(--accent-soft)" />

        {isCatching ? (
          <ellipse cx="74" cy="61.5" rx="3.8" ry="4.4" fill="var(--text)" />
        ) : (
          <path d="M68.5 60.5 Q74 66 79.5 60.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
        )}

        {/* Yellow lanyard badge */}
        <path d="M64 71 L74 80 L84 71" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="68.5" y="79" width="11" height="8" rx="2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.5" />
      </g>

      {/* Live ticking checklist board during chunked upload */}
      {(isUploading || isMapping) && (
        <g className="check-pop">
          <rect
            x="98"
            y="28"
            width="44"
            height="58"
            rx="6"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2.2"
          />
          <rect x="110" y="23" width="20" height="8" rx="2.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />

          {/* Row 1 */}
          <circle cx="108" cy="43" r="4" fill={check1 ? "var(--positive)" : "var(--surface-muted)"} />
          {check1 && (
            <path d="M106 43 L107.5 44.5 L110.5 41.2" fill="none" stroke="var(--surface-strong)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <line x1="115" y1="43" x2="134" y2="43" stroke={check1 ? "var(--text)" : "var(--divider)"} strokeWidth="2.2" strokeLinecap="round" />

          {/* Row 2 */}
          <circle cx="108" cy="57" r="4" fill={check2 ? "var(--positive)" : "var(--surface-muted)"} />
          {check2 && (
            <path d="M106 57 L107.5 58.5 L110.5 55.2" fill="none" stroke="var(--surface-strong)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <line x1="115" y1="57" x2="134" y2="57" stroke={check2 ? "var(--text)" : "var(--divider)"} strokeWidth="2.2" strokeLinecap="round" />

          {/* Row 3 */}
          <circle cx="108" cy="71" r="4" fill={check3 ? "var(--positive)" : "var(--surface-muted)"} />
          {check3 && (
            <path d="M106 71 L107.5 72.5 L110.5 69.2" fill="none" stroke="var(--surface-strong)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <line x1="115" y1="71" x2="131" y2="71" stroke={check3 ? "var(--text)" : "var(--divider)"} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {/* Ink-green stamped shield badge on batch completion */}
      {isDone && (
        <g className="scout-stamp-pop">
          <path
            d="M114 34 C126 34 134 38.5 134 44.5 V61 C134 73 114 81 114 81 C114 81 94 73 94 61 V44.5 C94 38.5 102 34 114 34 Z"
            fill={hasErrors ? "var(--warning-soft)" : "var(--positive)"}
            stroke="var(--text)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {hasErrors ? (
            <path d="M106 57 L111.5 62 L122 50" fill="none" stroke="var(--warning)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M105.5 56.5 L111.5 62.5 L123 49.5" fill="none" stroke="var(--surface-strong)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <path
            d="M138 24 L139.5 27.5 L143 29 L139.5 30.5 L138 34 L136.5 30.5 L133 29 L136.5 27.5 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1"
          />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Bulk Lookup Detective Shield (catching / searching / perfect / partial) */
/* -------------------------------------------------------------------------- */

export type LookupDetectiveMood = "idle" | "catching" | "searching" | "perfect" | "partial";

export function LookupDetectiveCharacter({
  mood = "idle",
  className,
}: {
  mood?: LookupDetectiveMood;
  className?: string;
}) {
  const isSearching = mood === "searching";
  const isPerfect = mood === "perfect";
  const isPartial = mood === "partial";
  const isCatching = mood === "catching";

  return (
    <svg
      viewBox="0 0 116 88"
      className={cn("h-16 w-20 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="56" cy="80" rx="34" ry="4.5" fill="var(--surface-muted)" />
      <circle
        cx="54"
        cy="44"
        r="30"
        fill={isPerfect ? "var(--positive-soft)" : isPartial ? "var(--warning-soft)" : "var(--accent-soft)"}
        opacity="0.78"
      />

      {/* Shield body */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center bottom",
          transform: isCatching ? "translateY(-3px) scale(1.03)" : isPartial ? "rotate(-4deg)" : "rotate(0deg)",
        }}
        className={SPRING}
      >
        {/* Main Shield */}
        <path
          d="M44 18 C57 18 66 23 66 30 V50 C66 64 44 73 44 73 C44 73 22 64 22 50 V30 C22 23 31 18 44 18 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />

        {/* Detective visor cap */}
        <path
          d="M24 25 C28 13 60 13 64 25 Z"
          fill="var(--surface)"
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="23" y="22" width="42" height="4.5" rx="2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
        <path d="M21 26.5 H68" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />

        {/* Eyes */}
        {isPerfect ? (
          <>
            <path d="M32.5 39 Q36 34.5 39.5 39" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M48.5 39 Q52 34.5 55.5 39" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
          </>
        ) : (
          <g className="scout-blink">
            <g className={isSearching ? "scout-pupil-scan" : undefined}>
              <ellipse cx="36.5" cy="39.5" rx="2.6" ry="3.1" fill="var(--text)" />
              <circle cx="37.4" cy="38.3" r="0.95" fill="var(--surface-strong)" />
              <ellipse cx="51.5" cy="39.5" rx="2.6" ry="3.1" fill="var(--text)" />
              <circle cx="52.4" cy="38.3" r="0.95" fill="var(--surface-strong)" />
            </g>
          </g>
        )}

        <ellipse cx="29.5" cy="44" rx="2.3" ry="1.5" fill="var(--accent-soft)" />
        <ellipse cx="58.5" cy="44" rx="2.3" ry="1.5" fill="var(--accent-soft)" />

        {isPartial ? (
          <path d="M40.5 49.5 Q44 47.5 47.5 49.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
        ) : (
          <path d="M39.5 47.5 Q44 52 48.5 47.5" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        )}
      </g>

      {/* Contextual right-side inspector emblem */}
      {isPerfect && (
        <g className="scout-stamp-pop">
          <circle cx="84" cy="44" r="14" fill="var(--positive)" stroke="var(--text)" strokeWidth="2.2" />
          <path d="M77.5 44 L82 48.5 L91 38.5" fill="none" stroke="var(--surface-strong)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M94 22 L95.3 25 L98.5 26.3 L95.3 27.6 L94 31 L92.7 27.6 L89.5 26.3 L92.7 25 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="1" />
        </g>
      )}

      {isPartial && (
        <g className="scout-float">
          <rect x="69" y="34" width="36" height="22" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <rect x="72.5" y="38" width="29" height="6" rx="1.5" fill="var(--warning-soft)" />
          <text x="87" y="43.5" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="var(--warning)">
            PLATE ?
          </text>
          <line x1="74" y1="49" x2="100" y2="49" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="71" cy="54" r="7" fill="color-mix(in srgb, var(--surface-strong) 65%, var(--accent-soft))" stroke="var(--text)" strokeWidth="2" />
        </g>
      )}

      {(isIdleOrSearch(mood)) && (
        <g className={isSearching ? "scout-lens-scan" : undefined}>
          <path d="M63 50 L72 44" fill="none" stroke="var(--text)" strokeWidth="2.8" strokeLinecap="round" />
          <circle
            cx="81"
            cy="36"
            r="12"
            fill="color-mix(in srgb, var(--surface-strong) 62%, var(--accent-soft))"
            stroke="var(--text)"
            strokeWidth="2.2"
          />
          <path d="M75 30.5 A8 8 0 0 1 85 27" fill="none" stroke="var(--surface-strong)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function isIdleOrSearch(mood: LookupDetectiveMood) {
  return mood === "idle" || mood === "searching" || mood === "catching";
}

/* -------------------------------------------------------------------------- */
/* 4. Rollback Hard-Hat Shield (ImportHistory ConfirmButton popover)          */
/* -------------------------------------------------------------------------- */

export function RollbackGuardCharacter({
  active = true,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 56 56"
      className={cn("size-10 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <circle cx="26" cy="30" r="21" fill="var(--negative-soft)" />

      {/* Shield torso */}
      <path
        d="M25 18 C34 18 40 22 40 27 V38 C40 46.5 25 51 25 51 C25 51 10 46.5 10 38 V27 C10 22 16 18 25 18 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Yellow hard hat */}
      <path
        d="M12 22 C13.5 12.5 36.5 12.5 38 22 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <line x1="25" y1="14" x2="25" y2="21.5" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 22.5 H40.5" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Alert eyes + cautious smile */}
      <g className="scout-blink">
        <circle cx="20.5" cy="31" r="2" fill="var(--text)" />
        <circle cx="29.5" cy="31" r="2" fill="var(--text)" />
      </g>
      <path d="M22 37.5 Q25 35.5 28 37.5" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />

      {/* Rewind badge */}
      <g className={active ? "scout-rewind" : undefined}>
        <circle cx="42" cy="40" r="9.5" fill="var(--surface-strong)" stroke="var(--negative)" strokeWidth="2" />
        <path
          d="M45.5 38.5 A4.2 4.2 0 1 0 43.2 44"
          fill="none"
          stroke="var(--negative)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polyline points="42.5,35.5 46,38.5 42.5,40.5" fill="none" stroke="var(--negative)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Empty Documents Folder Keeper (DocumentsCard)                           */
/* -------------------------------------------------------------------------- */

export function FolderKeeperCharacter({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 124 94"
      className={cn("group h-20 w-28 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="62" cy="84" rx="44" ry="5" fill="var(--surface-muted)" />

      {/* Back folder sheet */}
      <path
        d="M20 26 C20 22.5 22.5 20 26 20 H50 L57 29 H98 C101.5 29 104 31.5 104 35 V76 C104 79.5 101.5 82 98 82 H26 C22.5 82 20 79.5 20 76 Z"
        fill="var(--accent-soft)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Pip peeking out from inside the folder */}
      <g className={cn("scout-float", SPRING)}>
        <path
          d="M62 22 C75 22 83 26.5 83 32.5 V54 H41 V32.5 C41 26.5 49 22 62 22 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M50 28.5 C54 26.8 58 26 62 26 C66 26 70 26.8 74 28.5"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <g className="scout-blink">
          <ellipse cx="55" cy="40" rx="2.5" ry="3" fill="var(--text)" />
          <circle cx="55.8" cy="39" r="0.9" fill="var(--surface-strong)" />
          <ellipse cx="69" cy="40" rx="2.5" ry="3" fill="var(--text)" />
          <circle cx="69.8" cy="39" r="0.9" fill="var(--surface-strong)" />
        </g>
        <ellipse cx="48.5" cy="44" rx="2.2" ry="1.4" fill="var(--accent-soft)" />
        <ellipse cx="75.5" cy="44" rx="2.2" ry="1.4" fill="var(--accent-soft)" />
        <path d="M58 46.5 Q62 50 66 46.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      </g>

      {/* Front yellow folder flap */}
      <path
        d="M16 53 C16 50.5 18 49 20.5 49 H103.5 C106 49 108 50.5 108 53 L104 78 C103.5 80.5 101.5 82 99 82 H25 C22.5 82 20.5 80.5 20 78 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="36" y1="64" x2="88" y2="64" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" opacity="0.25" />

      {/* Two little paws perched on top edge of folder pocket */}
      <ellipse cx="44" cy="49.5" rx="5.5" ry="3.8" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
      <ellipse cx="80" cy="49.5" rx="5.5" ry="3.8" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Cozy Chat-Bubble Shield (Standalone general ticket/quote with no policy)*/
/* -------------------------------------------------------------------------- */

export function ChatShieldCharacter({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 92"
      className={cn("h-20 w-28 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="58" cy="83" rx="40" ry="4.5" fill="var(--surface-muted)" />
      <circle cx="52" cy="48" r="28" fill="var(--accent-soft)" opacity="0.7" />

      {/* Sitting Shield Character */}
      <path
        d="M42 29 C54 29 62 34 62 40.5 V59 C62 72 42 79 42 79 C42 79 22 72 22 59 V40.5 C22 34 30 29 42 29 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M31 35.5 C35 33.8 38.5 33 42 33 C45.5 33 49 33.8 53 35.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />
      <g className="scout-blink">
        <circle cx="35.5" cy="49" r="2.4" fill="var(--text)" />
        <circle cx="36.2" cy="48.1" r="0.85" fill="var(--surface-strong)" />
        <circle cx="48.5" cy="49" r="2.4" fill="var(--text)" />
        <circle cx="49.2" cy="48.1" r="0.85" fill="var(--surface-strong)" />
      </g>
      <ellipse cx="29.5" cy="54" rx="2.2" ry="1.5" fill="var(--accent-soft)" />
      <ellipse cx="54.5" cy="54" rx="2.2" ry="1.5" fill="var(--accent-soft)" />
      <path d="M38 56.5 Q42 60 46 56.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />

      {/* Cozy hand gesture toward message */}
      <path d="M62 56 Q68 53 71 49" fill="none" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="71" cy="49" r="3.2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.7" />

      {/* Floating chat bubble with 3 typing wave dots */}
      <g className="scout-float">
        <path
          d="M62 18 H102 C105.5 18 108 20.5 108 24 V42 C108 45.5 105.5 48 102 48 H76 L67 55 V48 H62 C58.5 48 56 45.5 56 42 V24 C56 20.5 58.5 18 62 18 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <circle cx="73" cy="33" r="2.6" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" className="scout-dot" />
        <circle cx="82" cy="33" r="2.6" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" className="scout-dot" style={{ animationDelay: "180ms" }} />
        <circle cx="91" cy="33" r="2.6" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" className="scout-dot" style={{ animationDelay: "360ms" }} />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Architect Draftsman Shield (ReportsPage blueprint cards)                */
/* -------------------------------------------------------------------------- */

export type BlueprintVariant = "bars" | "donut" | "users" | "rupee";

export function ArchitectDraftsmanCharacter({
  variant = "bars",
  className,
}: {
  variant?: BlueprintVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 132 92"
      className={cn("h-20 w-28 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="66" cy="83" rx="46" ry="4.5" fill="var(--surface-muted)" />

      {/* Unrolled blueprint sheet on right */}
      <rect
        x="58"
        y="18"
        width="60"
        height="58"
        rx="5"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.1"
      />
      <rect x="62" y="22" width="52" height="50" rx="2" fill="var(--accent-soft)" opacity="0.55" />
      {/* Rolled edge at bottom */}
      <rect x="55" y="71" width="66" height="8" rx="4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.9" />

      {/* Bespoke mini wireframe chart per report card */}
      {variant === "bars" && (
        <g stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round">
          <line x1="68" y1="62" x2="108" y2="62" />
          <rect x="71" y="48" width="6" height="14" rx="1" fill="var(--surface-strong)" strokeDasharray="2 2" />
          <rect x="82" y="38" width="6" height="24" rx="1" fill="var(--accent)" />
          <rect x="93" y="43" width="6" height="19" rx="1" fill="var(--surface-strong)" strokeDasharray="2 2" />
          <rect x="104" y="31" width="6" height="31" rx="1" fill="var(--surface-strong)" />
        </g>
      )}
      {variant === "donut" && (
        <g>
          <circle cx="88" cy="46" r="13" fill="none" stroke="var(--divider)" strokeWidth="5" />
          <circle
            cx="88"
            cy="46"
            r="13"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeDasharray="34 48"
            strokeLinecap="round"
            transform="rotate(-90 88 46)"
          />
          <circle cx="88" cy="46" r="15.5" fill="none" stroke="var(--text)" strokeWidth="1.3" strokeDasharray="3 3" />
        </g>
      )}
      {variant === "users" && (
        <g stroke="var(--text)" strokeWidth="1.6">
          <circle cx="80" cy="40" r="5" fill="var(--accent)" />
          <path d="M71 57 C71 51 89 51 89 57" fill="var(--surface-strong)" strokeLinecap="round" />
          <circle cx="98" cy="42" r="4.2" fill="var(--surface-strong)" />
          <path d="M91 57 C91 52 105 52 105 57" fill="none" strokeDasharray="2.5 2" strokeLinecap="round" />
        </g>
      )}
      {variant === "rupee" && (
        <g>
          <circle cx="88" cy="46" r="13" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.8" strokeDasharray="3 2" />
          <text x="88" y="51" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">
            ₹
          </text>
        </g>
      )}

      {/* Left: Draftsman Shield Pip */}
      <g>
        <path
          d="M40 26 C52 26 60 31 60 37.5 V57 C60 70 40 77 40 77 C40 77 20 70 20 57 V37.5 C20 31 28 26 40 26 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Yellow drafting cap visor */}
        <path
          d="M22 33 Q40 28 58 33 L61 36.5 Q40 32.5 19 36.5 Z"
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <g className="scout-blink">
          <circle cx="33.5" cy="46.5" r="2.3" fill="var(--text)" />
          <circle cx="34.2" cy="45.6" r="0.8" fill="var(--surface-strong)" />
          <circle cx="46.5" cy="46.5" r="2.3" fill="var(--text)" />
          <circle cx="47.2" cy="45.6" r="0.8" fill="var(--surface-strong)" />
        </g>
        <path d="M36 53.5 Q40 57 44 53.5" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* Triangle set-square ruler + drafting pencil */}
      <g className="scout-float">
        <polygon points="10,74 28,46 28,74" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.9" strokeLinejoin="round" />
        <polygon points="18,69 24,59 24,69" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Error Boundary Repair Mechanic (DashboardError)                         */
/* -------------------------------------------------------------------------- */

export function RepairMechanicCharacter({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 144 112"
      className={cn("h-28 w-36 shrink-0 select-none overflow-visible", className)}
      role="img"
      aria-label="Repair Scout holding a wrench"
    >
      <ellipse cx="72" cy="100" rx="48" ry="5.5" fill="var(--surface-muted)" />
      <circle cx="72" cy="54" r="40" fill="var(--negative-soft)" />

      {/* Center Shield Mechanic */}
      <path
        d="M68 22 C83 22 93 28 93 36 V62 C93 79 68 89 68 89 C68 89 43 79 43 62 V36 C43 28 53 22 68 22 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Slanted yellow mechanic bandana headband */}
      <path
        d="M45 34 Q68 27 91 34 L90 38.5 Q68 32.5 46 38.5 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="92.5" cy="36" r="3.4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />

      {/* Apologetic eyes & band-aid patch */}
      <path d="M53 45 Q57.5 42 61.5 45.5" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M74.5 45.5 Q78.5 42 83 45" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      <g className="scout-blink">
        <ellipse cx="58" cy="51.5" rx="2.7" ry="3.2" fill="var(--text)" />
        <circle cx="59" cy="50.2" r="1" fill="var(--surface-strong)" />
        <ellipse cx="78" cy="51.5" rx="2.7" ry="3.2" fill="var(--text)" />
        <circle cx="79" cy="50.2" r="1" fill="var(--surface-strong)" />
      </g>
      <path d="M63.5 61.5 Q68 58 72.5 61.5" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />

      {/* Cute adhesive patch on left shield cheek */}
      <g transform="rotate(-18 52 67)">
        <rect x="46" y="64" width="12" height="6" rx="2" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="1.3" />
        <circle cx="50" cy="67" r="0.8" fill="var(--text)" />
        <circle cx="54" cy="67" r="0.8" fill="var(--text)" />
      </g>

      {/* Open-ended wrench held neatly by right paw */}
      <g className="scout-wrench">
        <line x1="92" y1="60" x2="112" y2="39" stroke="var(--text)" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="115" cy="36" r="6.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
        <polygon points="115,36 121,30 123,35" fill="var(--negative-soft)" />
        <circle cx="91" cy="61" r="4.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Verification Reviewer Micro-Reaction (VerificationControl reject note)  */
/* -------------------------------------------------------------------------- */

export function VerificationReviewerCharacter({
  charCount,
  minChars = 5,
  busy = false,
  hasError = false,
  className,
}: {
  charCount: number;
  minChars?: number;
  busy?: boolean;
  hasError?: boolean;
  className?: string;
}) {
  const ready = charCount >= minChars;
  const pct = Math.min(1, charCount / minChars);
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200",
        hasError
          ? "border-negative/50 bg-negative-soft text-negative"
          : ready
            ? "border-positive/40 bg-positive-soft text-positive"
            : "border-divider bg-surface-strong text-ink-muted",
        className,
      )}
    >
      <svg viewBox="0 0 36 36" className="size-6 shrink-0 select-none" aria-hidden="true">
        {/* Progress ring tracking 0..minChars characters */}
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={hasError ? "var(--negative)" : ready ? "var(--positive)" : "var(--warning)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dashoffset 220ms cubic-bezier(0.22,1,0.36,1), stroke 200ms" }}
        />

        {/* Mini reviewer head/badge inside ring */}
        <path
          d="M18 9.5 C23 9.5 26 11.5 26 14 V20.5 C26 24.8 18 27.5 18 27.5 C18 27.5 10 24.8 10 20.5 V14 C10 11.5 13 9.5 18 9.5 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {ready ? (
          <path
            d="M14.5 18.2 L17 20.7 L21.8 15.5"
            fill="none"
            stroke="var(--positive)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="check-pop"
          />
        ) : (
          <g>
            {/* Eyes glance slightly toward progress */}
            <circle cx="15.3" cy="17.2" r="1.35" fill="var(--text)" />
            <circle cx="20.7" cy="17.2" r="1.35" fill="var(--text)" />
            <path d="M16 21 H20" stroke="var(--text)" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
      </svg>

      <span>
        {busy
          ? "Sending reason…"
          : ready
            ? "Ready to notify client"
            : `${minChars - charCount} more char${minChars - charCount === 1 ? "" : "s"} needed`}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Push Dispatch Courier Shield (NotificationsShell live audience prop)   */
/* -------------------------------------------------------------------------- */

const CATEGORY_TAGS: Record<string, string> = {
  car: "CAR",
  bike: "2W",
  health: "HEALTH",
  term: "TERM",
  other: "OTHER",
};

export function CourierShieldCharacter({
  audience = "everyone",
  category = "",
  confirmed = false,
  className,
}: {
  audience?: string;
  category?: string;
  confirmed?: boolean;
  className?: string;
}) {
  const isUser = audience === "user";
  const isExpiring = audience === "expiring";
  const isAdvisorClients = audience === "advisor_clients";
  const isGeneralUsers = audience === "general_users";
  const categoryTag = category ? CATEGORY_TAGS[category] ?? category.slice(0, 6).toUpperCase() : "";

  return (
    <svg
      viewBox="0 0 116 80"
      className={cn("h-16 w-24 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="56" cy="73" rx="38" ry="4" fill="var(--surface-muted)" />
      <circle cx="48" cy="40" r="28" fill="var(--accent-soft)" opacity="0.8" />

      {/* Courier Shield Character */}
      <path
        d="M42 18 C54 18 62 23 62 29.5 V48 C62 61 42 68 42 68 C42 68 22 61 22 48 V29.5 C22 23 30 18 42 18 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Snappy Courier Cap */}
      <path d="M24 23 C28 13 56 13 60 23 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M23 23.5 H65" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />

      <g className="scout-blink">
        <circle cx="35.5" cy="38.5" r="2.3" fill="var(--text)" />
        <circle cx="36.2" cy="37.6" r="0.8" fill="var(--surface-strong)" />
        <circle cx="48.5" cy="38.5" r="2.3" fill="var(--text)" />
        <circle cx="49.2" cy="37.6" r="0.8" fill="var(--surface-strong)" />
      </g>
      <path d="M38 45.5 Q42 49 46 45.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />

      {/* Audience Prop Switcher on Right */}
      {isUser ? (
        /* Direct 1-to-1 sealed envelope */
        <g className="check-pop">
          <rect x="70" y="31" width="32" height="22" rx="3.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <polyline points="71,33 86,44 101,33" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="96" cy="48" r="4" fill="var(--positive)" stroke="var(--surface-strong)" strokeWidth="1.4" />
        </g>
      ) : isExpiring ? (
        /* Calendar expiry card + optional category tag */
        <g className="check-pop">
          <rect x="71" y="28" width="30" height="28" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <rect x="71" y="28" width="30" height="8" rx="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
          <text x="86" y="49" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)">
            DUE
          </text>
          {categoryTag && (
            <g className="check-pop">
              <rect x="78" y="13" width="32" height="13" rx="6.5" fill="var(--text)" />
              <text x="94" y="22" textAnchor="middle" fontSize="6.8" fontWeight="700" fill="var(--surface-strong)">
                {categoryTag}
              </text>
            </g>
          )}
        </g>
      ) : isAdvisorClients ? (
        /* VIP star folder */
        <g className="check-pop">
          <rect x="70" y="30" width="30" height="24" rx="4" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <path d="M85 35 L87 39.5 L92 40 L88.2 43.2 L89.5 48 L85 45.5 L80.5 48 L81.8 43.2 L78 40 L83 39.5 Z" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.3" strokeLinejoin="round" />
        </g>
      ) : isGeneralUsers ? (
        /* Multi-user group emblem */
        <g className="check-pop">
          <rect x="69" y="30" width="32" height="24" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <circle cx="80" cy="40" r="3.4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" />
          <circle cx="91" cy="40" r="3.4" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.4" />
          <path d="M74 50 C74 46 86 46 86 50" fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M86 50 C86 46.5 96 46.5 96 50" fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ) : (
        /* Everyone: megaphone broadcast + sound waves */
        <g className="check-pop">
          <polygon points="71,40 90,31 90,51 71,43" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
          <line x1="76" y1="45" x2="74" y2="53" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
          <g className="scout-waves">
            <path d="M95 36 Q99 41 95 46" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M100 32 Q106 41 100 50" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* Ready checkmark seal once broadcast confirm box is ticked */}
      {confirmed && !isUser && (
        <circle cx="102" cy="58" r="6" fill="var(--positive)" stroke="var(--surface-strong)" strokeWidth="1.6" className="check-pop" />
      )}
    </svg>
  );
}
