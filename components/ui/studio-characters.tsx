import { cn } from "@/lib/cn";

/**
 * Studio Shield Crew characters for CRM chrome, RBAC access controls, agency settings,
 * drawer guards, notification bell states, and per-module bespoke empty states.
 * Hook-free so they render cleanly in both Server and Client Components with Hudson CSS tokens.
 */

export type ModuleEmptyVariant =
  | "claims"
  | "quotes"
  | "clients"
  | "policies"
  | "ads"
  | "placements"
  | "support"
  | "staff"
  | "roles";

/** Shared anatomical Shield Pip body parameterized for reuse across variants without duplicating paths. */
function MiniShieldTorso({
  cx = 44,
  cy = 48,
  eyes = "blink",
  mouth = "smile",
  lanyard = false,
  crown = false,
}: {
  cx?: number;
  cy?: number;
  eyes?: "blink" | "happy" | "calm" | "alert";
  mouth?: "smile" | "flat" | "o";
  lanyard?: boolean;
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
        <>
          <path d="M33 43.5 Q36.5 39 40 43.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M48 43.5 Q51.5 39 55 43.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
        </>
      ) : eyes === "calm" ? (
        <>
          <path d="M33 42.5 Q36.5 45.2 40 42.5" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          <path d="M48 42.5 Q51.5 45.2 55 42.5" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <g className="scout-blink">
          <ellipse cx="36.5" cy="43" rx={eyes === "alert" ? 3 : 2.6} ry={eyes === "alert" ? 3.6 : 3.1} fill="var(--text)" />
          <circle cx="37.4" cy="41.8" r="0.95" fill="var(--surface-strong)" />
          <ellipse cx="51.5" cy="43" rx={eyes === "alert" ? 3 : 2.6} ry={eyes === "alert" ? 3.6 : 3.1} fill="var(--text)" />
          <circle cx="52.4" cy="41.8" r="0.95" fill="var(--surface-strong)" />
        </g>
      )}

      {/* Cheeks */}
      <ellipse cx="29.5" cy="48" rx="2.3" ry="1.5" fill="var(--accent-soft)" />
      <ellipse cx="58.5" cy="48" rx="2.3" ry="1.5" fill="var(--accent-soft)" />

      {/* Mouth */}
      {mouth === "flat" ? (
        <line x1="40.5" y1="53" x2="47.5" y2="53" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      ) : mouth === "o" ? (
        <circle cx="44" cy="53" r="2.2" fill="var(--text)" />
      ) : (
        <path d="M39.5 51.5 Q44 55.5 48.5 51.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      )}

      {/* Optional signature lanyard */}
      {lanyard && (
        <g>
          <path d="M35 61 L44 68 L53 61" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="39.5" y="66.5" width="9" height="6.5" rx="1.8" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" />
        </g>
      )}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Notification Bell Sentinel & Calm Headphones (NotificationBell)         */
/* -------------------------------------------------------------------------- */

export function BellWatcherCharacter({
  mood = "calm",
  compact = false,
  className,
}: {
  mood?: "calm" | "alert";
  compact?: boolean;
  className?: string;
}) {
  const isAlert = mood === "alert";

  return (
    <svg
      viewBox="0 0 112 86"
      className={cn(compact ? "h-8 w-10" : "h-16 w-20", "shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="56" cy="78" rx="34" ry="4" fill="var(--surface-muted)" />
      <circle
        cx="50"
        cy="44"
        r="28"
        fill={isAlert ? "var(--accent-soft)" : "var(--surface-muted)"}
        opacity={isAlert ? 0.9 : 0.75}
      />

      <MiniShieldTorso
        cx={44}
        cy={48}
        eyes={isAlert ? "alert" : "calm"}
        mouth="smile"
      />

      {/* Calm mode: cozy over-ear yellow headphones */}
      {!isAlert && (
        <g>
          <path d="M22 42 C22 18 66 18 66 42" fill="none" stroke="var(--text)" strokeWidth="2.6" strokeLinecap="round" />
          <rect x="17" y="37" width="7" height="13" rx="3.2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
          <rect x="64" y="37" width="7" height="13" rx="3.2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
        </g>
      )}

      {/* Brass bell beside Pip */}
      <g className={isAlert ? "scout-bell-rock" : undefined}>
        <path
          d="M84 30 C77 30 74 36 74 44 L71 49 H97 L94 44 C94 36 91 30 84 30 Z"
          fill={isAlert ? "var(--accent)" : "var(--surface-strong)"}
          stroke="var(--text)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="84" cy="27.5" r="2.2" fill="var(--text)" />
        <path d="M81 49 A3 3 0 0 0 87 49" fill="var(--text)" />
        {isAlert ? (
          <>
            <path d="M68 31 Q66 36 68 41" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M100 31 Q102 36 100 41" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
          </>
        ) : (
          <text x="93" y="26" fontSize="9.5" fontWeight="700" fill="var(--text-muted)">
            z
          </text>
        )}
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. RBAC Access Guardian & Account Role Pip (Permissions Drawer & Topbar)   */
/* -------------------------------------------------------------------------- */

export function AccessGuardianCharacter({
  isAdmin = false,
  grantCount = 0,
  revokeCount = 0,
  compact = false,
  className,
}: {
  isAdmin?: boolean;
  grantCount?: number;
  revokeCount?: number;
  compact?: boolean;
  className?: string;
}) {
  const hasCustom = !isAdmin && (grantCount > 0 || revokeCount > 0);

  return (
    <svg
      viewBox="0 0 112 86"
      className={cn(compact ? "h-10 w-12" : "h-14 w-[74px]", "shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="54" cy="79" rx="34" ry="4" fill="var(--surface-muted)" />
      <circle
        cx="52"
        cy="46"
        r="29"
        fill={isAdmin || grantCount > 0 ? "var(--accent-soft)" : "var(--surface-muted)"}
        opacity="0.82"
      />

      <MiniShieldTorso
        cx={44}
        cy={48}
        crown={isAdmin}
        lanyard={!isAdmin}
        eyes={isAdmin ? "happy" : "blink"}
        mouth="smile"
      />

      {/* Right hand holding Admin Star Medal, Override Key Ring, or Role Card */}
      {isAdmin ? (
        <g className="scout-float">
          <circle cx="84" cy="44" r="11" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <path
            d="M84 37.5 L85.9 41.8 L90.5 42.3 L87 45.4 L88 50 L84 47.6 L80 50 L81 45.4 L77.5 42.3 L82.1 41.8 Z"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g>
          {/* Brass key held neatly */}
          <circle cx="82" cy="40" r="8" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <circle cx="82" cy="40" r="2.6" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.4" />
          <path d="M82 48 V64 M82 58 H88 M82 62 H86" stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round" />

          {/* Override count indicator badges */}
          {hasCustom && grantCount > 0 && (
            <g className="check-pop">
              <circle cx="94" cy="28" r="7.5" fill="var(--positive)" stroke="var(--surface-strong)" strokeWidth="1.6" />
              <text x="94" y="31" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="var(--surface-strong)">
                +{grantCount}
              </text>
            </g>
          )}
          {hasCustom && revokeCount > 0 && (
            <g className="check-pop">
              <circle cx="94" cy="56" r="7.5" fill="var(--negative)" stroke="var(--surface-strong)" strokeWidth="1.6" />
              <text x="94" y="59" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="var(--surface-strong)">
                -{revokeCount}
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Agency License Seal (BusinessProfileForm & SettingsPage)                */
/* -------------------------------------------------------------------------- */

export function AgencySealCharacter({
  state = "idle",
  className,
}: {
  state?: "idle" | "saved" | "readonly" | "missing";
  className?: string;
}) {
  const isSaved = state === "saved";
  const isReadonly = state === "readonly";
  const isMissing = state === "missing";

  return (
    <svg
      viewBox="0 0 118 86"
      className={cn("h-14 w-[76px] shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="58" cy="79" rx="36" ry="4" fill="var(--surface-muted)" />
      <circle
        cx="54"
        cy="45"
        r="28"
        fill={isSaved ? "var(--positive-soft)" : isMissing ? "var(--warning-soft)" : "var(--accent-soft)"}
        opacity="0.82"
      />

      <MiniShieldTorso
        cx={40}
        cy={48}
        eyes={isSaved ? "happy" : "blink"}
        mouth={isMissing ? "flat" : "smile"}
        lanyard={!isMissing}
      />

      {/* Framed License Card on right */}
      <g>
        <rect x="65" y="26" width="42" height="34" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
        <rect x="70" y="32" width="16" height="5" rx="1.5" fill="var(--accent)" />
        <line x1="70" y1="43" x2="98" y2="43" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="70" y1="50" x2="90" y2="50" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />

        {isSaved && (
          <g className="scout-stamp-pop">
            <circle cx="98" cy="54" r="9.5" fill="var(--positive)" stroke="var(--text)" strokeWidth="1.8" />
            <path d="M93.5 54 L96.8 57.2 L103 50.5" fill="none" stroke="var(--surface-strong)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {isReadonly && (
          <g>
            <rect x="90" y="48" width="13" height="11" rx="2.5" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.7" />
            <path d="M93 48 V45 C93 42.5 100 42.5 100 45 V48" fill="none" stroke="var(--text)" strokeWidth="1.7" />
          </g>
        )}

        {isMissing && (
          <g className="scout-float">
            <circle cx="98" cy="28" r="8.5" fill="var(--warning)" stroke="var(--text)" strokeWidth="1.7" />
            <line x1="98" y1="24" x2="98" y2="28.5" stroke="var(--surface-strong)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="98" cy="31.5" r="1.1" fill="var(--surface-strong)" />
          </g>
        )}
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Unsaved Changes Drawer Guard Mini (Drawer)                              */
/* -------------------------------------------------------------------------- */

export function UnsavedGuardMini({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 40"
      className={cn("h-7 w-8 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      {/* Raised "Hold on!" stop hand */}
      <g className={active ? "scout-guard-wave" : undefined}>
        <path d="M12 24 Q6 20 6.5 13" fill="none" stroke="var(--text)" strokeWidth="2.3" strokeLinecap="round" />
        <circle cx="6.5" cy="11.5" r="3.4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
      </g>

      {/* Compact shield face */}
      <path
        d="M24 8 C32 8 37 11 37 15.5 V26 C37 33.5 24 37.5 24 37.5 C24 37.5 11 33.5 11 26 V15.5 C11 11 16 8 24 8 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M16 12.5 C19 11.2 21.5 10.6 24 10.6 C26.5 10.6 29 11.2 32 12.5" fill="none" stroke="var(--accent)" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="19.5" cy="20.5" r="1.8" fill="var(--text)" />
      <circle cx="28.5" cy="20.5" r="1.8" fill="var(--text)" />
      <path d="M21 26.5 Q24 24.5 27 26.5" fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Interactive Sidebar Crest Emblem (Sidebar group/brand)                  */
/* -------------------------------------------------------------------------- */

export function SidebarShieldEmblem({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 place-items-center rounded-control bg-ink text-white", className)}>
      <svg viewBox="0 0 28 28" className="size-6 select-none" aria-hidden="true">
        {/* Shield silhouette inside dark square */}
        <path
          d="M14 4 C19.5 4 23 6.2 23 9.2 V16 C23 21 14 24.5 14 24.5 C14 24.5 5 21 5 16 V9.2 C5 6.2 8.5 4 14 4 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 8.5 C11 7.6 12.5 7.2 14 7.2 C15.5 7.2 17 7.6 18.5 8.5"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Left eye calmly static, right eye winks smoothly on hover */}
        <circle cx="11" cy="14" r="1.45" fill="var(--accent)" />
        <circle cx="17" cy="14" r="1.45" fill="var(--accent)" className="sidebar-wink-eye" />
        <path d="M11.8 17.8 Q14 19.8 16.2 17.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Bespoke Per-Module Empty State Characters (ModulePage & RolesTable)     */
/* -------------------------------------------------------------------------- */

export function ModuleEmptyCharacter({
  variant,
  className,
}: {
  variant: ModuleEmptyVariant;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 124 92"
      className={cn("h-20 w-28 shrink-0 select-none overflow-visible", className)}
      aria-hidden="true"
    >
      <ellipse cx="62" cy="83" rx="44" ry="4.5" fill="var(--surface-muted)" />
      <circle cx="56" cy="46" r="30" fill="var(--accent-soft)" opacity="0.72" />

      <MiniShieldTorso
        cx={42}
        cy={48}
        eyes={variant === "clients" ? "happy" : "blink"}
        lanyard={variant === "staff" || variant === "roles"}
        crown={variant === "roles"}
      />

      {/* Variant-specific studio prop on right side */}
      {variant === "claims" && (
        /* Protective Yellow Umbrella */
        <g className="scout-float">
          <path d="M84 22 C71 22 65 31 65 39 H103 C103 31 97 22 84 22 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M84 39 V59 C84 63 79 63 79 59.5" fill="none" stroke="var(--text)" strokeWidth="2.3" strokeLinecap="round" />
          <line x1="84" y1="19" x2="84" y2="22" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {variant === "quotes" && (
        /* Quotation Rupee Tag + Mini Pad */
        <g className="scout-float">
          <path d="M68 32 H91 L101 44 L91 56 H68 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="93" cy="44" r="2.2" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.3" />
          <text x="80" y="49" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">
            ₹
          </text>
        </g>
      )}

      {(variant === "ads" || variant === "placements") && (
        /* Showcase Billboard Easel */
        <g>
          <line x1="74" y1="56" x2="70" y2="74" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="98" y1="56" x2="102" y2="74" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="66" y="26" width="40" height="30" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <rect x="70" y="30" width="32" height="12" rx="2" fill="var(--accent)" />
          <line x1="71" y1="48" x2="96" y2="48" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {variant === "clients" && (
        /* Directory Contact Card */
        <g className="scout-float">
          <rect x="66" y="30" width="40" height="28" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="77" cy="41" r="4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.5" />
          <path d="M71 51 C71 47 83 47 83 51" fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="87" y1="39" x2="100" y2="39" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
          <line x1="87" y1="46" x2="97" y2="46" stroke="var(--divider)" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {variant === "policies" && (
        /* Shielded Binder Vault */
        <g>
          <rect x="67" y="26" width="36" height="42" rx="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <rect x="67" y="26" width="8" height="42" rx="2" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <rect x="81" y="35" width="16" height="9" rx="2" fill="var(--accent-soft)" stroke="var(--text)" strokeWidth="1.4" />
          <line x1="81" y1="51" x2="97" y2="51" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="81" y1="58" x2="93" y2="58" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {variant === "support" && (
        /* LifeBuoy Ring + Headset */
        <g className="scout-float">
          <circle cx="86" cy="45" r="14" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="86" cy="45" r="6" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.8" />
          <rect x="83" y="31" width="6" height="8" rx="1" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <rect x="83" y="51" width="6" height="8" rx="1" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <rect x="72" y="42" width="8" height="6" rx="1" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
          <rect x="92" y="42" width="8" height="6" rx="1" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.2" />
        </g>
      )}

      {(variant === "staff" || variant === "roles") && (
        /* Role Badge Ledger */
        <g className="scout-float">
          <rect x="68" y="28" width="36" height="36" rx="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.1" />
          <circle cx="80" cy="41" r="4.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
          <line x1="88" y1="41" x2="98" y2="41" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          <line x1="75" y1="52" x2="97" y2="52" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
