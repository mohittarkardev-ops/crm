import { cn } from "@/lib/cn";

/**
 * Bespoke Shield Crew illustrations tailored to every workflow in the Incentive Management System.
 * Uses strictly Hudson CSS design tokens (no hard-coded hex values, server & client safe).
 */

function PipBody({
  cx = 44,
  cy = 48,
  eyes = "blink",
  mouth = "smile",
  glasses = false,
  crown = false,
}: {
  cx?: number;
  cy?: number;
  eyes?: "blink" | "happy" | "focused" | "worried";
  mouth?: "smile" | "flat" | "o";
  glasses?: boolean;
  crown?: boolean;
}) {
  const dx = cx - 44;
  const dy = cy - 48;

  return (
    <g transform={`translate(${dx} ${dy})`}>
      {crown && (
        <path
          d="M32 21 L35 13.5 L40.5 18 L44 12 L47.5 18 L53 13.5 L56 21 Z"
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      )}

      {/* Shield Silhouette */}
      <path
        d="M44 21 C57 21 66 26 66 33 V53 C66 67 44 75 44 75 C44 75 22 67 22 53 V33 C22 26 31 21 44 21 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M32 28 C36 26.2 40 25.4 44 25.4 C48 25.4 52 26.2 56 28"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.8"
        strokeLinecap="round"
      />

      {/* Eyes */}
      {eyes === "happy" ? (
        <g className="transition-transform duration-200 group-hover/crew:scale-105" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <path d="M33 43.5 Q36.5 39 40 43.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M48 43.5 Q51.5 39 55 43.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
        </g>
      ) : eyes === "worried" ? (
        <>
          <path d="M32.5 37.5 Q36.5 35.5 39.5 38" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M48.5 38 Q51.5 35.5 55.5 37.5" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="36.5" cy="43.5" r="2.5" fill="var(--text)" />
          <circle cx="51.5" cy="43.5" r="2.5" fill="var(--text)" />
        </>
      ) : (
        <g className="scout-blink">
          <ellipse cx="36.5" cy="43" rx={eyes === "focused" ? 2.9 : 2.6} ry={eyes === "focused" ? 3.4 : 3.1} fill="var(--text)" />
          <circle cx="37.4" cy="41.8" r="0.95" fill="var(--surface-strong)" />
          <ellipse cx="51.5" cy="43" rx={eyes === "focused" ? 2.9 : 2.6} ry={eyes === "focused" ? 3.4 : 3.1} fill="var(--text)" className="sidebar-wink-eye" />
          <circle cx="52.4" cy="41.8" r="0.95" fill="var(--surface-strong)" />
        </g>
      )}

      {glasses && (
        <g>
          <circle cx="36.5" cy="43" r="6" fill="none" stroke="var(--text)" strokeWidth="1.5" />
          <circle cx="51.5" cy="43" r="6" fill="none" stroke="var(--text)" strokeWidth="1.5" />
          <line x1="42.5" y1="43" x2="45.5" y2="43" stroke="var(--text)" strokeWidth="1.5" />
        </g>
      )}

      <ellipse cx="29.5" cy="48.5" rx="2.3" ry="1.4" fill="var(--accent-soft)" />
      <ellipse cx="58.5" cy="48.5" rx="2.3" ry="1.4" fill="var(--accent-soft)" />

      {/* Mouth */}
      {mouth === "flat" ? (
        <path d="M40 53.5 Q44 51.5 48 53.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      ) : mouth === "o" ? (
        <circle cx="44" cy="53" r="2.1" fill="var(--text)" />
      ) : (
        <path d="M39.5 51.5 Q44 55.5 48.5 51.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      )}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Vehicle Category Character (Overview / 2W / 4W / CW Dashboards)         */
/* -------------------------------------------------------------------------- */

export function IncentiveVehicleCharacter({
  variant = "all",
  qualified = false,
  className,
}: {
  variant?: "all" | "2W" | "4W" | "CW";
  qualified?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 132 92" className={cn("group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]", className)} aria-hidden="true">
      <ellipse cx="64" cy="83" rx="46" ry="4.5" fill="var(--surface-muted)" />
      <circle
        cx="56"
        cy="45"
        r="30"
        fill={qualified ? "var(--positive-soft)" : "var(--accent-soft)"}
        opacity="0.82"
      />

      <PipBody cx={40} cy={47} eyes={qualified ? "happy" : "blink"} crown={variant === "all" || qualified} />

      {/* Two-Wheeler (2W) prop */}
      {variant === "2W" && (
        <g className="scout-float">
          <circle cx="80" cy="64" r="9.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="80" cy="64" r="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.5" />
          <circle cx="110" cy="64" r="9.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="110" cy="64" r="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.5" />
          <path
            d="M80 64 L91 49 H103 L110 64 M98 41 H106 L103 49 M87 49 L84 44 H77"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="85" y="45" width="13" height="5" rx="2.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" />
        </g>
      )}

      {/* Four-Wheeler (4W) prop */}
      {variant === "4W" && (
        <g className="scout-float">
          <path
            d="M74 52 L80 39 H108 L114 52 V65 H74 Z"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M83 42 H105 L108 50 H80 Z" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="1.5" />
          <circle cx="82" cy="57" r="2.7" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <circle cx="106" cy="57" r="2.7" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <rect x="89" y="56" width="10" height="4" rx="1" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.1" />
          <rect x="78" y="65" width="7" height="5" rx="1.5" fill="var(--text)" />
          <rect x="103" y="65" width="7" height="5" rx="1.5" fill="var(--text)" />
        </g>
      )}

      {/* Commercial Vehicle (CW) prop */}
      {variant === "CW" && (
        <g className="scout-float">
          <rect x="69" y="34" width="30" height="27" rx="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="2.1" />
          <path
            d="M99 42 H112 L117 50 V61 H99 Z"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M102 45 H110 L113 50 H102 Z" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="1.3" />
          <circle cx="80" cy="64" r="6" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <circle cx="80" cy="64" r="2" fill="var(--text)" />
          <circle cx="108" cy="64" r="6" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
          <circle cx="108" cy="64" r="2" fill="var(--text)" />
        </g>
      )}

      {/* Executive / All Vehicles Rupee Trophy */}
      {variant === "all" && (
        <g className="scout-float">
          <path
            d="M78 32 H108 V44 C108 54 99 60 93 60 C87 60 78 54 78 44 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M78 36 H72 C72 44 75 47 78 47 M108 36 H114 C114 44 111 47 108 47" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          <line x1="93" y1="60" x2="93" y2="69" stroke="var(--text)" strokeWidth="2.4" />
          <rect x="83" y="69" width="20" height="5" rx="2" fill="var(--text)" />
          <text x="93" y="49" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">
            ₹
          </text>
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Rule Architect (Rule Builder & Slab Configuration)                      */
/* -------------------------------------------------------------------------- */

export function RuleArchitectCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 92" className={cn("group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]", className)} aria-hidden="true">
      <ellipse cx="64" cy="83" rx="45" ry="4.5" fill="var(--surface-muted)" />
      <circle cx="56" cy="45" r="30" fill="var(--accent-soft)" opacity="0.82" />

      <PipBody cx={40} cy={47} eyes="focused" glasses />

      {/* Ascending slab step chart blueprint */}
      <g className="scout-float">
        <rect x="68" y="25" width="52" height="46" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
        <rect x="75" y="54" width="8" height="10" rx="1.5" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.4" className="reveal-down" />
        <rect x="86" y="46" width="8" height="18" rx="1.5" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="1.4" className="reveal-down" style={{ animationDelay: "60ms" }} />
        <rect x="97" y="38" width="8" height="26" rx="1.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" className="reveal-down" style={{ animationDelay: "120ms" }} />
        <rect x="108" y="30" width="6" height="34" rx="1.5" fill="var(--positive-soft)" stroke="var(--text)" strokeWidth="1.4" className="reveal-down" style={{ animationDelay: "180ms" }} />
        <circle cx="111" cy="24" r="5.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" className="scout-stamp-pop" />
        <text x="111" y="27" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="var(--text)">
          ₹
        </text>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Location PIN Locator (Assignments & PIN Directory & Conflicts)          */
/* -------------------------------------------------------------------------- */

export function PinLocatorCharacter({
  state = "idle",
  className,
}: {
  state?: "idle" | "importing" | "conflict" | "verified";
  className?: string;
}) {
  const isConflict = state === "conflict";
  const isVerified = state === "verified";
  const isImporting = state === "importing";

  return (
    <svg
      viewBox="0 0 128 90"
      className={cn(
        "group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]",
        isConflict && "micro-shake",
        className,
      )}
      aria-hidden="true"
    >
      <ellipse cx="62" cy="82" rx="42" ry="4.5" fill="var(--surface-muted)" />
      <circle
        cx="54"
        cy="45"
        r="29"
        fill={isConflict ? "var(--warning-soft)" : isVerified ? "var(--positive-soft)" : "var(--accent-soft)"}
        opacity="0.82"
      />

      <PipBody
        cx={40}
        cy={47}
        eyes={isConflict ? "worried" : isVerified ? "happy" : "blink"}
        mouth={isConflict ? "flat" : "smile"}
      />

      {/* Map card + India Post PIN pin drop */}
      <g className={isImporting ? "scout-catcher-float" : "scout-float"}>
        <rect x="70" y="35" width="44" height="34" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
        <line x1="76" y1="54" x2="108" y2="54" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        <line x1="76" y1="61" x2="98" y2="61" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />

        {isImporting && (
          <circle cx="92" cy="29.5" r="14" fill="none" stroke="var(--accent-strong)" strokeWidth="1.6" className="scout-waves" />
        )}

        {/* Teardrop Map Pin */}
        <path
          d="M92 17 C84.5 17 79 22.5 79 29.8 C79 38.5 92 49 92 49 C92 49 105 38.5 105 29.8 C105 22.5 99.5 17 92 17 Z"
          fill={isConflict ? "var(--warning)" : isVerified ? "var(--positive)" : "var(--accent)"}
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="92" cy="29.5" r="4.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Daily Ledger Auditor (Daily & Claim Traceability)                       */
/* -------------------------------------------------------------------------- */

export function LedgerAuditorCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 90" className={cn("group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]", className)} aria-hidden="true">
      <ellipse cx="62" cy="82" rx="42" ry="4.5" fill="var(--surface-muted)" />
      <circle cx="56" cy="45" r="29" fill="var(--accent-soft)" opacity="0.8" />

      <PipBody cx={40} cy={47} eyes="focused" />

      {/* Ledger sheet + magnifying glass */}
      <g>
        <rect x="70" y="25" width="40" height="46" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
        <rect x="76" y="32" width="18" height="5" rx="1.5" fill="var(--accent)" />
        <line x1="76" y1="43" x2="103" y2="43" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        <line x1="76" y1="51" x2="103" y2="51" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        <line x1="76" y1="59" x2="94" y2="59" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        <g className="scout-lens-scan">
          <circle cx="101" cy="54" r="9.5" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="2.1" />
          <line x1="108" y1="61" x2="116" y2="69" stroke="var(--text)" strokeWidth="2.8" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Settlement & Payout Banker                                              */
/* -------------------------------------------------------------------------- */

export function SettlementBankerCharacter({
  state = "review",
  className,
}: {
  state?: "open" | "review" | "finalized" | "paid" | "forfeited" | "exceptions";
  className?: string;
}) {
  const isPaid = state === "paid" || state === "finalized";
  const isWarn = state === "exceptions" || state === "forfeited";

  return (
    <svg viewBox="0 0 128 90" className={cn("group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]", className)} aria-hidden="true">
      <ellipse cx="62" cy="82" rx="42" ry="4.5" fill="var(--surface-muted)" />
      <circle
        cx="56"
        cy="45"
        r="29"
        fill={isPaid ? "var(--positive-soft)" : isWarn ? "var(--warning-soft)" : "var(--accent-soft)"}
        opacity="0.82"
      />

      <PipBody
        cx={40}
        cy={47}
        eyes={state === "paid" ? "happy" : isWarn ? "worried" : "blink"}
        mouth={state === "forfeited" ? "flat" : "smile"}
        crown={state === "paid"}
      />

      {state === "finalized" ? (
        /* Locked padlock seal */
        <g className="scout-float">
          <path d="M81 41 V33 C81 26 99 26 99 33 V41" fill="none" stroke="var(--text)" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="74" y="40" width="32" height="27" rx="5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="90" cy="52" r="3" fill="var(--text)" />
          <line x1="90" y1="54" x2="90" y2="60" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      ) : state === "paid" ? (
        /* Gold Rupee coin wallet */
        <g className="scout-stamp-pop">
          <rect x="72" y="36" width="38" height="30" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <rect x="92" y="46" width="20" height="10" rx="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
          <circle cx="88" cy="29" r="9.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <text x="88" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
            ₹
          </text>
        </g>
      ) : state === "forfeited" ? (
        /* Hourglass encouraging next period */
        <g className="scout-float">
          <line x1="77" y1="27" x2="103" y2="27" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="77" y1="68" x2="103" y2="68" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />
          <path
            d="M80 27 L90 47 L100 27 M80 68 L90 48 L100 68"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M84 65 L90 56 L96 65 Z" fill="var(--accent)" />
        </g>
      ) : (
        /* Clipboard / Review check */
        <g className="scout-float">
          <rect x="72" y="27" width="38" height="44" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <rect x="83" y="23" width="16" height="7" rx="2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
          <path d="M80 42 L84 46 L91 38" fill="none" stroke="var(--positive)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="94" y1="43" x2="104" y2="43" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="83" cy="57" r="4" fill={isWarn ? "var(--warning)" : "var(--accent)"} />
          <line x1="94" y1="57" x2="104" y2="57" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Agent Milestone Climber (My Incentives personal progress)               */
/* -------------------------------------------------------------------------- */

export function AgentMilestoneCharacter({
  progressPct,
  targetAchieved,
  className,
}: {
  progressPct: number;
  targetAchieved: boolean;
  className?: string;
}) {
  if (targetAchieved) {
    return <IncentiveVehicleCharacter variant="all" qualified className={className} />;
  }

  return (
    <svg viewBox="0 0 128 90" className={cn("group/crew h-16 w-24 shrink-0 select-none overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]", className)} aria-hidden="true">
      <ellipse cx="62" cy="82" rx="42" ry="4.5" fill="var(--surface-muted)" />
      <circle cx="54" cy="45" r="29" fill="var(--accent-soft)" opacity="0.82" />

      <PipBody cx={40} cy={47} eyes={progressPct >= 50 ? "happy" : "focused"} />

      {/* Milestone Flag */}
      <g className="scout-float">
        <line x1="80" y1="22" x2="80" y2="70" stroke="var(--text)" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M80 24 L110 31 L80 40 Z"
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x="92" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--text)">
          {progressPct}%
        </text>
      </g>
    </svg>
  );
}
