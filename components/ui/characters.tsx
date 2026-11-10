/**
 * The SecureDrive Shield Crew — bespoke inline SVG mascot characters strictly styled with
 * Hudson CSS design tokens (no hard-coded hex values, calm reduced-motion-safe loops).
 */

function ShieldBase({
  accentTop = true,
  className = "",
}: {
  accentTop?: boolean;
  className?: string;
}) {
  return (
    <>
      <path
        d="M22 6 C30 6 36 9.5 36 13.5 V26 C36 34.5 22 40 22 40 C22 40 8 34.5 8 26 V13.5 C8 9.5 14 6 22 6 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2"
        strokeLinejoin="round"
        className={className}
      />
      {accentTop && (
        <path
          d="M14.5 10.8 C17 9.4 19.5 8.8 22 8.8 C24.5 8.8 27 9.4 29.5 10.8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

/** 1. Pip inspecting a slipped 404 policy slip (used on Not Found pages). */
export function PolicyScoutCharacter() {
  return (
    <svg
      viewBox="0 0 240 190"
      className="h-40 w-52 shrink-0 select-none sm:h-44 sm:w-56"
      role="img"
      aria-label="Pip the policy scout inspecting a missing file"
    >
      <ellipse cx="118" cy="172" rx="76" ry="8" fill="var(--surface-muted)" />
      <rect x="44" y="26" width="144" height="122" rx="22" fill="var(--accent-soft)" />

      <path
        d="M52 84 C52 78 56 74 62 74 H88 L96 84 H158 C164 84 168 88 168 94 V142 C168 148 164 152 158 152 H62 C56 152 52 148 52 142 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      <g className="scout-float" style={{ animationDelay: "-1.4s" }}>
        <g transform="rotate(10 184 96)">
          <rect
            x="156"
            y="58"
            width="56"
            height="72"
            rx="8"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2.2"
          />
          <rect x="165" y="68" width="22" height="10" rx="3" fill="var(--accent)" />
          <text
            x="176"
            y="75.5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="var(--text)"
            letterSpacing="0.06em"
          >
            404
          </text>
          <line x1="165" y1="88" x2="202" y2="88" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="165" y1="98" x2="196" y2="98" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="165" y1="108" x2="188" y2="108" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="197" cy="116" r="4" fill="var(--surface-muted)" stroke="var(--text)" strokeWidth="1.6" />
        </g>
      </g>

      <g>
        <path
          d="M110 38 C128 38 144 45 144 53 V92 C144 114 110 128 110 128 C110 128 76 114 76 92 V53 C76 45 92 38 110 38 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M92 47 C99 44 105 43 110 43 C115 43 121 44 128 47"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path d="M93 64 Q98 60 103 63" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        <path d="M118 62 Q123 58 128 62" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        <g className="scout-blink">
          <ellipse cx="99" cy="73" rx="3.4" ry="4.2" fill="var(--text)" />
          <circle cx="100.3" cy="71.4" r="1.2" fill="var(--surface-strong)" />
          <ellipse cx="123" cy="73" rx="3.4" ry="4.2" fill="var(--text)" />
          <circle cx="124.3" cy="71.4" r="1.2" fill="var(--surface-strong)" />
        </g>
        <circle cx="89" cy="80" r="3" fill="var(--accent-soft)" />
        <circle cx="132" cy="80" r="3" fill="var(--accent-soft)" />
        <circle cx="111.5" cy="83.5" r="2.6" fill="var(--text)" />
      </g>

      <rect
        x="48"
        y="96"
        width="124"
        height="58"
        rx="10"
        fill="var(--surface)"
        stroke="var(--text)"
        strokeWidth="2.2"
      />
      <rect x="64" y="112" width="42" height="8" rx="3" fill="var(--accent)" />
      <line x1="64" y1="128" x2="128" y2="128" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="64" y1="137" x2="104" y2="137" stroke="var(--divider)" strokeWidth="2.2" strokeLinecap="round" />

      <g className="scout-float">
        <circle cx="144" cy="112" r="6.5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.2" />
        <line x1="149" y1="108" x2="163" y2="96" stroke="var(--text)" strokeWidth="4.2" strokeLinecap="round" />
        <circle
          cx="176"
          cy="83"
          r="16"
          fill="color-mix(in srgb, var(--surface-strong) 55%, transparent)"
          stroke="var(--text)"
          strokeWidth="2.6"
        />
        <path
          d="M168 77 A11 11 0 0 1 179 72"
          fill="none"
          stroke="var(--surface-strong)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** 2. Friendly waving Shield Buddy for the Dashboard greeting strip. */
export function WavingShieldCharacter() {
  return (
    <svg viewBox="0 0 64 64" className="size-12 shrink-0 select-none sm:size-14" aria-hidden="true">
      <ellipse cx="34" cy="57" rx="18" ry="3.5" fill="var(--surface-muted)" />
      <circle cx="34" cy="31" r="22" fill="var(--accent-soft)" />

      {/* Waving arm */}
      <g className="scout-wave">
        <path
          d="M18 37 Q10 31 11 21"
          fill="none"
          stroke="var(--text)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="11" cy="20" r="3.8" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
      </g>

      {/* Main shield body */}
      <path
        d="M35 12 C45 12 52 16 52 21 V36 C52 46.5 35 53 35 53 C35 53 18 46.5 18 36 V21 C18 16 25 12 35 12 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M25 17.8 C28.2 16.2 31.6 15.5 35 15.5 C38.4 15.5 41.8 16.2 45 17.8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />

      {/* Face */}
      <g className="scout-blink">
        <circle cx="29.5" cy="29.5" r="2.3" fill="var(--text)" />
        <circle cx="30.2" cy="28.6" r="0.8" fill="var(--surface-strong)" />
        <circle cx="40.5" cy="29.5" r="2.3" fill="var(--text)" />
        <circle cx="41.2" cy="28.6" r="0.8" fill="var(--surface-strong)" />
      </g>
      <circle cx="25.5" cy="33.5" r="2" fill="var(--accent-soft)" />
      <circle cx="44.5" cy="33.5" r="2" fill="var(--accent-soft)" />
      <path d="M31.5 35.5 Q35 39 38.5 35.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />

      {/* Tiny sparkle */}
      <path
        d="M54 12 L55 15 L58 16 L55 17 L54 20 L53 17 L50 16 L53 15 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 3. StatCard 1 (Active Policies): mini shield guardian hugging a yellow policy folder. */
export function PolicyKeeperMini() {
  return (
    <svg viewBox="0 0 44 44" className="size-10 shrink-0 select-none" aria-hidden="true">
      <circle cx="22" cy="23" r="17" fill="var(--accent-soft)" />
      <ShieldBase />
      <g className="scout-blink">
        <circle cx="17.5" cy="20" r="1.7" fill="var(--text)" />
        <circle cx="26.5" cy="20" r="1.7" fill="var(--text)" />
      </g>
      <path d="M19.5 24 Q22 26.5 24.5 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Mini folder held in front */}
      <path
        d="M12 27.5 H20 L22 29.5 H32 V39 H12 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <line x1="15.5" y1="33.5" x2="28.5" y2="33.5" stroke="var(--text)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 4. StatCard 2 (New Clients): friendly shield buddy cheering with a welcome badge. */
export function WelcomeClientMini() {
  return (
    <svg viewBox="0 0 44 44" className="size-10 shrink-0 select-none" aria-hidden="true">
      <circle cx="22" cy="23" r="17" fill="var(--surface-muted)" />
      <ShieldBase />
      <g className="scout-blink">
        <circle cx="17.5" cy="20.5" r="1.7" fill="var(--text)" />
        <circle cx="26.5" cy="20.5" r="1.7" fill="var(--text)" />
      </g>
      <path d="M19 25 Q22 28 25 25" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Raised waving paw + yellow client badge */}
      <circle cx="35" cy="14" r="5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
      <path d="M35 11.8 V16.2 M32.8 14 H37.2" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 5. StatCard 3 (Renewal Revenue): shield keeper beside a gleaming INR coin medallion. */
export function RevenueVaultMini() {
  return (
    <svg viewBox="0 0 44 44" className="size-10 shrink-0 select-none" aria-hidden="true">
      <circle cx="22" cy="23" r="17" fill="var(--accent-soft)" />
      <ShieldBase />
      <g className="scout-blink">
        <circle cx="17.5" cy="19.5" r="1.7" fill="var(--text)" />
        <circle cx="26.5" cy="19.5" r="1.7" fill="var(--text)" />
      </g>
      <path d="M19.5 23.8 Q22 26 24.5 23.8" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Coin medallion */}
      <circle cx="31.5" cy="31.5" r="8.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.7" />
      <text x="31.5" y="34.8" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--text)">
        ₹
      </text>
    </svg>
  );
}

/** 6. StatCard 4 (Renewal Rate): shield champion holding a crisp renewal pennant flag. */
export function GoalFlagMini() {
  return (
    <svg viewBox="0 0 44 44" className="size-10 shrink-0 select-none" aria-hidden="true">
      <circle cx="22" cy="23" r="17" fill="var(--surface-muted)" />
      {/* Pennant flag */}
      <line x1="33" y1="8" x2="33" y2="33" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M33 9 L42 13 L33 17 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ShieldBase />
      <g className="scout-blink">
        <circle cx="17.5" cy="20.5" r="1.7" fill="var(--text)" />
        <circle cx="26.5" cy="20.5" r="1.7" fill="var(--text)" />
      </g>
      <path d="M19 25 Q22 28 25 25" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** 7. Donut Chart Center Mascot: friendly smiling emblem in Policies by Category. */
export function DonutCenterCharacter() {
  return (
    <svg viewBox="0 0 44 44" className="size-10 select-none" aria-hidden="true">
      <ShieldBase />
      <g className="scout-blink">
        <circle cx="17.5" cy="20.5" r="1.8" fill="var(--text)" />
        <circle cx="18.1" cy="19.8" r="0.6" fill="var(--surface-strong)" />
        <circle cx="26.5" cy="20.5" r="1.8" fill="var(--text)" />
        <circle cx="27.1" cy="19.8" r="0.6" fill="var(--surface-strong)" />
      </g>
      <circle cx="14.5" cy="23.8" r="1.6" fill="var(--accent-soft)" />
      <circle cx="29.5" cy="23.8" r="1.6" fill="var(--accent-soft)" />
      <path d="M19 25.5 Q22 28.5 25 25.5" fill="none" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** 8. Compact header courier buddy for Upcoming Renewals. */
export function CalendarCourierBadge() {
  return (
    <svg viewBox="0 0 36 36" className="size-8 shrink-0 select-none" aria-hidden="true">
      <circle cx="18" cy="18" r="15" fill="var(--accent-soft)" />
      <path
        d="M18 6.5 C24 6.5 29 9 29 12.5 V21 C29 27.5 18 31.5 18 31.5 C18 31.5 7 27.5 7 21 V12.5 C7 9 12 6.5 18 6.5 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12.5 10.5 C14.5 9.5 16.5 9 18 9 C19.5 9 21.5 9.5 23.5 10.5" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
      <g className="scout-blink">
        <circle cx="14.5" cy="17.5" r="1.4" fill="var(--text)" />
        <circle cx="21.5" cy="17.5" r="1.4" fill="var(--text)" />
      </g>
      <path d="M16 21.2 Q18 23.2 20 21.2" fill="none" stroke="var(--text)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** 9. Calm "All Caught Up" character for Dashboard empty states. */
export function RelaxedEmptyCharacter() {
  return (
    <svg viewBox="0 0 96 80" className="h-20 w-24 select-none" aria-hidden="true">
      <ellipse cx="48" cy="72" rx="30" ry="4.5" fill="var(--surface-muted)" />
      <rect x="18" y="14" width="60" height="50" rx="14" fill="var(--accent-soft)" />
      <path
        d="M45 18 C55 18 62 22 62 26.5 V44 C62 55 45 62 45 62 C45 62 28 55 28 44 V26.5 C28 22 35 18 45 18 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <path d="M35 23.5 C38.5 22 41.8 21.2 45 21.2 C48.2 21.2 51.5 22 55 23.5" fill="none" stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round" />
      {/* Happy closed / relaxed eyes */}
      <path d="M36.5 34 Q39 31.5 41.5 34" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M48.5 34 Q51 31.5 53.5 34" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M41.5 40.5 Q45 43.5 48.5 40.5" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Warm mug */}
      <g className="scout-float">
        <rect x="61" y="42" width="13" height="13" rx="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
        <path d="M74 45.5 H76.5 A2.5 2.5 0 0 1 76.5 51.5 H74" fill="none" stroke="var(--text)" strokeWidth="1.6" />
        <path d="M65.5 38 Q67 35 65.5 33" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M69.5 38 Q71 35 69.5 33" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** 10. Polite Gatekeeper character for /no-access screens. */
export function GatekeeperCharacter() {
  return (
    <svg viewBox="0 0 120 104" className="h-24 w-28 select-none" aria-hidden="true">
      <ellipse cx="60" cy="94" rx="38" ry="5" fill="var(--surface-muted)" />
      <rect x="24" y="16" width="72" height="66" rx="16" fill="var(--accent-soft)" />
      <path
        d="M56 20 C68 20 77 25 77 30.5 V53 C77 67 56 76 56 76 C56 76 35 67 35 53 V30.5 C35 25 44 20 56 20 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M44 26.5 C48.5 24.5 52.5 24 56 24 C59.5 24 63.5 24.5 68 26.5" fill="none" stroke="var(--accent)" strokeWidth="3.6" strokeLinecap="round" />
      <g className="scout-blink">
        <circle cx="49" cy="40" r="2.2" fill="var(--text)" />
        <circle cx="63" cy="40" r="2.2" fill="var(--text)" />
      </g>
      <line x1="51.5" y1="48" x2="60.5" y2="48" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
      {/* Small badge lock */}
      <g className="scout-float">
        <rect x="70" y="48" width="22" height="20" rx="5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
        <path d="M75.5 48 V43.5 A5.5 5.5 0 0 1 86.5 43.5 V48" fill="none" stroke="var(--text)" strokeWidth="2" />
        <circle cx="81" cy="58" r="2.3" fill="var(--text)" />
      </g>
    </svg>
  );
}
