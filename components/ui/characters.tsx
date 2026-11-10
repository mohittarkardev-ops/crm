import { cn } from "@/lib/cn";

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

export type MascotShift = "morning" | "midday" | "evening";

export function getShiftForHour(hour: number): MascotShift {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 19) return "midday";
  return "evening";
}

/** 2. Friendly waving Shield Buddy for the Dashboard greeting strip with time-of-day shift flair. */
export function WavingShieldCharacter({
  shift = "midday",
  waveKey = 0,
}: {
  shift?: MascotShift;
  waveKey?: number;
}) {
  return (
    <svg viewBox="0 0 84 68" className="h-14 w-[70px] shrink-0 select-none sm:h-16 sm:w-20" aria-hidden="true">
      <ellipse cx="43" cy="60" rx="30" ry="3.8" fill="var(--surface-muted)" />
      <circle
        cx="37"
        cy="33"
        r="22"
        fill="var(--accent-soft)"
        opacity={shift === "evening" ? 0.65 : 1}
      />

      {/* Evening: warm architect desk lamp casting a gentle glow cone behind the shield corner */}
      {shift === "evening" && (
        <g>
          <polygon
            points="64,31 40,58 76,58"
            fill="var(--accent-soft)"
            className="scout-lamp-glow"
          />
          <path
            d="M64 58 H76 C76 55.5 73 54 70 54 C67 54 64 55.5 64 58 Z"
            fill="var(--text)"
          />
          <path
            d="M71 54 L76 38 L67 27"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="76" cy="38" r="1.8" fill="var(--accent)" stroke="var(--text)" strokeWidth="1" />
          <path
            d="M60 31 C61 25 66 23 70 26 L68 35 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <circle cx="64.5" cy="32.8" r="1.7" fill="var(--surface-strong)" />
        </g>
      )}

      {/* Waving arm (calm continuous loop + instant burst when tapped) */}
      <g className="scout-wave">
        <g key={waveKey} className={waveKey > 0 ? "scout-wave-burst" : undefined}>
          <path
            d="M20 39 Q12 33 13 23"
            fill="none"
            stroke="var(--text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="13" cy="22" r="3.8" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.8" />
        </g>
      </g>

      {/* Main shield body */}
      <path
        d="M37 14 C47 14 54 18 54 23 V38 C54 48.5 37 55 37 55 C37 55 20 48.5 20 38 V23 C20 18 27 14 37 14 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M27 19.8 C30.2 18.2 33.6 17.5 37 17.5 C40.4 17.5 43.8 18.2 47 19.8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />

      {/* Mid-day flair: sporty yellow sun visor above the eyes */}
      {shift === "midday" && (
        <g>
          <path
            d="M21 22 C26 17.2 48 17.2 53 22 L52 24.8 C47 21.5 27 21.5 22 24.8 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M20 24.5 Q37 20 55 24.5 L57 27 Q37 23.2 19 27 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M28 23.5 Q37 21.8 46 23.5"
            fill="none"
            stroke="var(--surface-strong)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Evening flair: crescent moon pin clipped onto upper-right shield shoulder */}
      {shift === "evening" && (
        <g>
          <circle
            cx="48.5"
            cy="24.5"
            r="4.6"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="1.5"
          />
          <path
            d="M49.6 21.9 C47.5 21.9 46 23.1 46 24.5 C46 25.9 47.5 27.1 49.6 27.1 C48.3 26.3 48 25.4 48 24.5 C48 23.6 48.3 22.7 49.6 21.9 Z"
            fill="var(--accent)"
            stroke="var(--text)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Face */}
      <g className="scout-blink">
        <circle cx="31.5" cy="32" r="2.3" fill="var(--text)" />
        <circle cx="32.2" cy="31.1" r="0.85" fill="var(--surface-strong)" />
        <circle cx="42.5" cy="32" r="2.3" fill="var(--text)" />
        <circle cx="43.2" cy="31.1" r="0.85" fill="var(--surface-strong)" />
      </g>
      <circle cx="27.5" cy="36" r="2.1" fill="var(--accent-soft)" />
      <circle cx="46.5" cy="36" r="2.1" fill="var(--accent-soft)" />
      <path d="M33.5 38.5 Q37 42 40.5 38.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />

      {/* Morning flair: cozy right paw cradling a steaming coffee mug */}
      {shift === "morning" ? (
        <g>
          <path
            d="M54 39 Q58 41 60 45"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M73 43 C77 43 77 49.5 73 49.5"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="59"
            y="39"
            width="14"
            height="14.5"
            rx="3"
            fill="var(--surface-strong)"
            stroke="var(--text)"
            strokeWidth="2"
          />
          <rect x="60" y="44" width="12" height="5" fill="var(--accent)" />
          <ellipse cx="66" cy="39" rx="5.5" ry="1.6" fill="var(--text)" />
          <circle cx="59.5" cy="45.5" r="2.8" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.7" />
          <path
            d="M63 35 Q61 31.5 63.5 28"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="scout-steam"
          />
          <path
            d="M68.5 34.5 Q70.5 30.5 68 27"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="scout-steam"
            style={{ animationDelay: "1.1s" }}
          />
        </g>
      ) : (
        <g>
          <path
            d="M54 39 Q58 42.5 55.5 46.5"
            fill="none"
            stroke="var(--text)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="55.5" cy="46.5" r="3" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.7" />
        </g>
      )}

      {/* Tiny sparkle */}
      <path
        d="M56 13 L57 16 L60 17 L57 18 L56 21 L55 18 L52 17 L55 16 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 2b. Door-opening host Pip for the post-login WelcomeSplash reveal. */
export function SplashWelcomeCharacter({ shift = "midday" }: { shift?: MascotShift }) {
  return (
    <svg
      viewBox="0 0 168 128"
      className="h-32 w-44 select-none sm:h-36 sm:w-48"
      role="img"
      aria-label="Pip opening the SecureDrive portal door in welcome"
    >
      {/* Floor shadow + threshold warm light */}
      <ellipse cx="84" cy="116" rx="58" ry="6.5" fill="color-mix(in srgb, var(--text) 9%, transparent)" />
      <circle cx="84" cy="64" r="52" fill="var(--accent-soft)" opacity="0.55" />

      {/* Arched doorway frame */}
      <path
        d="M46 112 V48 C46 25 63 14 84 14 C105 14 122 25 122 48 V112 Z"
        fill="var(--accent-soft)"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Bright inner doorway glow & floor beam */}
      <path
        d="M52 112 V50 C52 31 66 21 84 21 C102 21 116 31 116 50 V112 Z"
        fill="var(--surface-strong)"
      />
      <polygon
        points="54,112 114,112 124,117 44,117"
        fill="var(--accent-soft)"
        opacity="0.7"
      />

      {/* Swinging portal door leaf (hinged on left jamb) */}
      <g className="splash-door-leaf">
        <path
          d="M50 112 V49 C50 29 65 19 84 19 C103 19 118 29 118 49 V112 Z"
          fill="var(--surface)"
          stroke="var(--text)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M62 60 V49 C62 36 72 29 84 29 C96 29 106 36 106 49 V60 Z"
          fill="var(--surface-strong)"
          stroke="var(--divider)"
          strokeWidth="1.6"
        />
        <rect
          x="61"
          y="69"
          width="46"
          height="32"
          rx="3"
          fill="var(--surface-strong)"
          stroke="var(--divider)"
          strokeWidth="1.6"
        />
        <circle cx="109" cy="83" r="3.4" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
      </g>

      {/* Crisp threshold base line */}
      <line x1="34" y1="112" x2="134" y2="112" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Pip stepping forward cleanly out of the opened threshold */}
      <g className="splash-pip-step">
        {/* Left paw holding open threshold */}
        <path d="M68 72 Q58 75 60 82" fill="none" stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="60" cy="83" rx="5.2" ry="4" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />

        {/* Right greeting salute/wave arm */}
        <g className="splash-salute-arm">
          <path d="M110 68 Q124 61 127 47" fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="127" cy="46" r="4.8" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
        </g>

        {/* Shield torso */}
        <path
          d="M89 36 C104 36 113 42 113 49 V77 C113 93 89 102 89 102 C89 102 65 93 65 77 V49 C65 42 74 36 89 36 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M75 44 C80 41.5 84.5 40.8 89 40.8 C93.5 40.8 98 41.5 103 44"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Matching shift flair so Splash Pip seamlessly transitions into Dashboard Pip */}
        {shift === "midday" && (
          <g>
            <path
              d="M71 46 Q89 41 107 46 L109 49.5 Q89 45.5 69 49.5 Z"
              fill="var(--accent)"
              stroke="var(--text)"
              strokeWidth="1.9"
              strokeLinejoin="round"
            />
            <path
              d="M80 46 Q89 44.2 98 46"
              fill="none"
              stroke="var(--surface-strong)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        )}
        {shift === "evening" && (
          <g>
            <circle cx="104.5" cy="49" r="5" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.6" />
            <path
              d="M105.7 46.2 C103.5 46.2 102 47.5 102 49 C102 50.5 103.5 51.8 105.7 51.8 C104.3 51 104 50 104 49 C104 48 104.3 47 105.7 46.2 Z"
              fill="var(--accent)"
              stroke="var(--text)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Warm happy eyes + welcoming smile */}
        <path d="M77 52.5 Q80.5 49.5 84 52" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M94 52 Q97.5 49.5 101 52.5" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
        <g className="scout-blink">
          <ellipse cx="80.5" cy="58.5" rx="2.7" ry="3.3" fill="var(--text)" />
          <circle cx="81.4" cy="57.2" r="1" fill="var(--surface-strong)" />
          <ellipse cx="97.5" cy="58.5" rx="2.7" ry="3.3" fill="var(--text)" />
          <circle cx="98.4" cy="57.2" r="1" fill="var(--surface-strong)" />
        </g>
        <ellipse cx="73.5" cy="63.5" rx="2.8" ry="1.8" fill="var(--accent-soft)" />
        <ellipse cx="104.5" cy="63.5" rx="2.8" ry="1.8" fill="var(--accent-soft)" />
        <path d="M84 65.5 Q89 70.5 94 65.5" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />

        {/* Same iconic yellow SecureDrive staff lanyard badge from /login */}
        <path
          d="M78 75 L89 86 L100 75"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="89" cy="86" r="1.9" fill="var(--text)" />
        <rect
          x="82"
          y="87"
          width="14"
          height="10"
          rx="2.5"
          fill="var(--accent)"
          stroke="var(--text)"
          strokeWidth="1.7"
        />
        <line x1="85.5" y1="92" x2="90.5" y2="92" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="93.2" cy="92" r="1.7" fill="var(--positive)" />
      </g>

      {/* Morning brew doorstep cup when shift is morning */}
      {shift === "morning" && (
        <g className="splash-sparkle" style={{ animationDelay: "980ms" }}>
          <path d="M136 101 C139.5 101 139.5 107 136 107" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="123" y="98" width="13" height="13.5" rx="2.8" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.9" />
          <rect x="124" y="102.5" width="11" height="4.5" fill="var(--accent)" />
          <ellipse cx="129.5" cy="98" rx="5" ry="1.5" fill="var(--text)" />
          <path d="M127.5 94.5 Q125.5 91 128 87.5" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" className="scout-steam" />
          <path d="M132 94 Q134 90.5 131.5 87" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" className="scout-steam" style={{ animationDelay: "1.1s" }} />
        </g>
      )}

      {/* Celebratory portal sparkles */}
      <path
        d="M36 42 L37.6 46 L41.5 47.5 L37.6 49 L36 53 L34.4 49 L30.5 47.5 L34.4 46 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.1"
        strokeLinejoin="round"
        className="splash-sparkle"
        style={{ animationDelay: "1050ms" }}
      />
      <path
        d="M137 26 L138.4 29.5 L142 31 L138.4 32.5 L137 36 L135.6 32.5 L132 31 L135.6 29.5 Z"
        fill="var(--accent)"
        stroke="var(--text)"
        strokeWidth="1.1"
        strokeLinejoin="round"
        className="splash-sparkle"
        style={{ animationDelay: "1200ms" }}
      />
      <circle
        cx="141"
        cy="66"
        r="3.2"
        fill="var(--positive)"
        stroke="var(--text)"
        strokeWidth="1.2"
        className="splash-sparkle"
        style={{ animationDelay: "1320ms" }}
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

/** 11. Portal Vault Keeper for /claim access code unlock gate. */
export function PortalVaultCharacter() {
  return (
    <svg viewBox="0 0 120 96" className="mx-auto h-24 w-28 select-none" aria-hidden="true">
      <ellipse cx="60" cy="87" rx="38" ry="5" fill="var(--surface-muted)" />
      <rect x="22" y="12" width="76" height="62" rx="16" fill="var(--accent-soft)" />
      <path
        d="M54 17 C65 17 74 21.5 74 27 V48 C74 61.5 54 70 54 70 C54 70 34 61.5 34 48 V27 C34 21.5 43 17 54 17 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M42.5 23 C46.5 21.2 50.5 20.6 54 20.6 C57.5 20.6 61.5 21.2 65.5 23" fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" />
      <g className="scout-blink">
        <circle cx="47.5" cy="36.5" r="2.1" fill="var(--text)" />
        <circle cx="48.1" cy="35.8" r="0.7" fill="var(--surface-strong)" />
        <circle cx="60.5" cy="36.5" r="2.1" fill="var(--text)" />
        <circle cx="61.1" cy="35.8" r="0.7" fill="var(--surface-strong)" />
      </g>
      <circle cx="42.5" cy="40.5" r="2" fill="var(--accent-soft)" />
      <circle cx="65.5" cy="40.5" r="2" fill="var(--accent-soft)" />
      <path d="M50 43.5 Q54 46.5 58 43.5" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" />
      {/* Yellow access keycard badge */}
      <g className="scout-float">
        <rect x="66" y="39" width="28" height="22" rx="5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
        <circle cx="75" cy="49" r="3" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="1.5" />
        <line x1="81" y1="47" x2="89" y2="47" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="81" y1="52" x2="87" y2="52" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** 12. Vehicle Plate Scout for /claim Step 2 initial lookup state. */
export function VehicleScoutCharacter() {
  return (
    <svg viewBox="0 0 156 98" className="mx-auto h-24 w-36 select-none" aria-hidden="true">
      <ellipse cx="78" cy="89" rx="52" ry="5" fill="var(--surface-muted)" />
      <rect x="20" y="14" width="116" height="64" rx="16" fill="var(--accent-soft)" />

      {/* Mini car + IND plate card */}
      <g transform="translate(68, 28)">
        <rect x="0" y="16" width="58" height="24" rx="7" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2" />
        <path d="M9 16 L16 5 H42 L49 16 Z" fill="var(--surface)" stroke="var(--text)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="28" r="3.2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" />
        <circle cx="46" cy="28" r="3.2" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.4" />
        <rect x="20" y="24" width="18" height="8" rx="2.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.3" />
        <text x="29" y="29.8" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="var(--text)">IND</text>
      </g>

      {/* Peeking Shield Buddy */}
      <g>
        <path
          d="M46 20 C56 20 64 24 64 29 V49 C64 62 46 70 46 70 C46 70 28 62 28 49 V29 C28 24 36 20 46 20 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M35.5 25.5 C39 24 42.5 23.4 46 23.4 C49.5 23.4 53 24 56.5 25.5" fill="none" stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round" />
        <g className="scout-blink">
          <circle cx="40.5" cy="38" r="2" fill="var(--text)" />
          <circle cx="51.5" cy="38" r="2" fill="var(--text)" />
        </g>
        <path d="M42.5 44.5 Q46 47.5 49.5 44.5" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" />
      </g>

      {/* Magnifying lens */}
      <g className="scout-float">
        <line x1="63" y1="51" x2="73" y2="43" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="81" cy="36" r="10.5" fill="color-mix(in srgb, var(--surface-strong) 60%, transparent)" stroke="var(--text)" strokeWidth="2.2" />
        <path d="M76 31.5 A7 7 0 0 1 83 28.5" fill="none" stroke="var(--surface-strong)" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** 13. Celebrating Claim Check Mascot for /claim submission confirmation screen. */
export function ClaimTrophyCharacter() {
  return (
    <svg viewBox="0 0 132 104" className="mx-auto h-24 w-32 select-none" aria-hidden="true">
      <ellipse cx="66" cy="95" rx="42" ry="5" fill="var(--surface-muted)" />
      <rect x="26" y="14" width="80" height="68" rx="20" fill="var(--positive-soft)" />

      {/* Sparkles */}
      <path d="M22 30 L23.5 34 L27.5 35.5 L23.5 37 L22 41 L20.5 37 L16.5 35.5 L20.5 34 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M108 24 L109.5 28 L113.5 29.5 L109.5 31 L108 35 L106.5 31 L102.5 29.5 L106.5 28 Z" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.1" strokeLinejoin="round" />

      {/* Celebrating Shield Mascot */}
      <g className="scout-float">
        <path
          d="M62 20 C75 20 84 25 84 31 V54 C84 69 62 78 62 78 C62 78 40 69 40 54 V31 C40 25 49 20 62 20 Z"
          fill="var(--surface-strong)"
          stroke="var(--text)"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path d="M49 26.5 C53.5 24.5 57.8 24 62 24 C66.2 24 70.5 24.5 75 26.5" fill="none" stroke="var(--accent)" strokeWidth="3.8" strokeLinecap="round" />
        {/* Happy cheering eyes */}
        <path d="M51 39 Q53.8 36 56.5 39" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M67.5 39 Q70.2 36 73 39" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="48" cy="43" r="2.3" fill="var(--accent-soft)" />
        <circle cx="76" cy="43" r="2.3" fill="var(--accent-soft)" />
        <path d="M56.5 46 Q62 51.5 67.5 46" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />

        {/* Positive check medal */}
        <circle cx="84" cy="60" r="11" fill="var(--positive)" stroke="var(--text)" strokeWidth="2" />
        <path d="M79 60.5 L82.5 64 L89.5 56.5" fill="none" stroke="var(--surface-strong)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export type LoginMascotMood = "ready" | "email" | "privacy" | "peek" | "checking" | "oops";

/** 14. Interactive Login Desk Mascot for /login (eye tracking, privacy paws, one-eye peek, error shake). */
export function LoginDeskCharacter({
  mood = "ready",
  emailProgress = 0,
  waveKey = 0,
}: {
  mood?: LoginMascotMood;
  /** 0..1 cursor/typing progress used to pan pupils across the email input. */
  emailProgress?: number;
  /** Increment to trigger a friendly wave gesture on click. */
  waveKey?: number;
}) {
  const clamped = Math.max(0, Math.min(1, emailProgress));
  const isPrivacy = mood === "privacy";
  const isPeek = mood === "peek";
  const isEmail = mood === "email";
  const isChecking = mood === "checking";
  const isOops = mood === "oops";

  const lookX = isEmail
    ? -2.2 + clamped * 4.4
    : isPeek
      ? 0.9
      : isChecking
        ? -1.2
        : 0;
  const lookY = isEmail
    ? 1.7
    : isPeek
      ? 1.6
      : isChecking
        ? -1.4
        : 0;

  return (
    <svg
      viewBox="0 0 140 112"
      className={cn("mx-auto h-26 w-32 select-none", isOops && "micro-shake")}
      role="img"
      aria-label={
        isPrivacy
          ? "SecureDrive mascot politely covering its eyes while you enter your password"
          : isPeek
            ? "SecureDrive mascot peeking with one eye while your password is shown"
            : isChecking
              ? "SecureDrive mascot checking your sign-in details"
              : isOops
                ? "SecureDrive mascot looking puzzled after a sign-in error"
                : "SecureDrive mascot welcoming you to sign in"
      }
    >
      <ellipse cx="70" cy="102" rx="44" ry="5" fill="var(--surface-muted)" />
      <rect
        x="24"
        y="12"
        width="92"
        height="74"
        rx="22"
        fill={isOops ? "var(--negative-soft)" : "var(--accent-soft)"}
        className="transition-colors duration-200"
      />

      {/* Waving left arm when clicked / greeting */}
      {waveKey > 0 && !isPrivacy && !isPeek && (
        <g key={waveKey} className="scout-wave" style={{ transformOrigin: "44px 56px" }}>
          <path d="M44 56 Q28 48 27 34" fill="none" stroke="var(--text)" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="27" cy="33" r="4.5" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
        </g>
      )}

      {/* Shield body */}
      <path
        d="M70 18 C85 18 96 24 96 31 V58 C96 74 70 84 70 84 C70 84 44 74 44 58 V31 C44 24 55 18 70 18 Z"
        fill="var(--surface-strong)"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M55 25.5 C60 23.2 65 22.5 70 22.5 C75 22.5 80 23.2 85 25.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Brows */}
      {isOops ? (
        <g>
          <path d="M53.5 34 Q59 29.5 64 33" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
          <path d="M76 35.5 L86 33.5" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : isChecking ? (
        <g>
          <path d="M54 34 L64 35.5" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M76 35.5 L86 34" fill="none" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <path d="M54.5 35 Q59.5 33 64.5 35" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
          <path d="M75.5 35 Q80.5 33 85.5 35" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" opacity="0.65" />
        </g>
      )}

      {/* Eye sockets + live tracking pupils */}
      <g className={!isOops && !isChecking ? "scout-blink" : undefined}>
        <circle cx="59.5" cy="43" r="5" fill="var(--surface-muted)" stroke="var(--divider)" strokeWidth="1.2" />
        <circle cx="80.5" cy="43" r="5" fill="var(--surface-muted)" stroke="var(--divider)" strokeWidth="1.2" />
        <g
          style={{ transform: `translate(${lookX}px, ${lookY}px)` }}
          className="transition-transform duration-150 ease-out"
        >
          <circle cx="59.5" cy="43" r="2.7" fill="var(--text)" />
          <circle cx="60.4" cy="42" r="0.9" fill="var(--surface-strong)" />
          <circle cx="80.5" cy="43" r="2.7" fill="var(--text)" />
          <circle cx="81.4" cy="42" r="0.9" fill="var(--surface-strong)" />
        </g>
      </g>

      {/* Cheeks */}
      <circle cx="52" cy="49.5" r="2.4" fill="var(--accent-soft)" />
      <circle cx="88" cy="49.5" r="2.4" fill="var(--accent-soft)" />

      {/* Mouth expression */}
      {isOops ? (
        <circle cx="70" cy="54" r="3" fill="none" stroke="var(--text)" strokeWidth="2" />
      ) : isChecking ? (
        <line x1="65.5" y1="53.5" x2="74.5" y2="53.5" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
      ) : isPeek ? (
        <path d="M65.5 53 Q70 55.5 75.5 52" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M64 52 Q70 57 76 52" fill="none" stroke="var(--text)" strokeWidth="2.1" strokeLinecap="round" />
      )}

      {/* Staff lanyard badge */}
      <rect x="61" y="65" width="18" height="11" rx="3" fill="var(--accent)" stroke="var(--text)" strokeWidth="1.6" />
      <line x1="65" y1="70.5" x2="75" y2="70.5" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round" />

      {/* Paws — transformBox: "fill-box" + transformOrigin: "center" rotates/moves around each paw accurately */}
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transform:
            isPrivacy || isPeek
              ? "translate(13.5px, -21px) rotate(14deg)"
              : isChecking
                ? "translate(4px, -6px) rotate(8deg)"
                : "translate(0px, 0px)",
        }}
        className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <ellipse cx="46" cy="64" rx="8.5" ry="6" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.2" />
        <line x1="43" y1="62" x2="43" y2="66" stroke="var(--divider)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="47" y1="62" x2="47" y2="66" stroke="var(--divider)" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transform: isPrivacy
            ? "translate(-13.5px, -21px) rotate(-14deg)"
            : isPeek
              ? "translate(-8px, -11px) rotate(10deg)"
              : isChecking
                ? "translate(-4px, -6px) rotate(-8deg)"
                : "translate(0px, 0px)",
        }}
        className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <ellipse cx="94" cy="64" rx="8.5" ry="6" fill="var(--surface-strong)" stroke="var(--text)" strokeWidth="2.2" />
        <line x1="93" y1="62" x2="93" y2="66" stroke="var(--divider)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="97" y1="62" x2="97" y2="66" stroke="var(--divider)" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      {/* State status bubble (valid email sparkle / checking / oops ?) */}
      {isOops && (
        <g className="scout-float">
          <circle cx="106" cy="24" r="9" fill="var(--surface-strong)" stroke="var(--negative)" strokeWidth="2" />
          <text x="106" y="27.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--negative)">
            ?
          </text>
        </g>
      )}
      {isChecking && (
        <g className="scout-float">
          <circle cx="106" cy="24" r="9" fill="var(--accent)" stroke="var(--text)" strokeWidth="2" />
          <circle cx="106" cy="24" r="3" fill="var(--text)" />
        </g>
      )}
    </svg>
  );
}
