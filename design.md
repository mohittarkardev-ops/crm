# SecureDrive CRM — Design System (v2, "Hudson" reference)

Source of truth for every CRM screen. Read this before building or editing any component.
Reference: neutral grey canvas, yellow accent, text sidebar, editorial rules under titles.
This replaces v1 (frosted green). Scope: web CRM only (Next.js + React). The mobile app has its own rules.

---

## 1. Principles

1. **Neutral and editorial.** Soft grey canvas, near-white cards, black text. Colour is rare and meaningful.
2. **One accent: yellow.** It marks highlights (stat bars, bar-chart fill, "hot" chips), never large backgrounds or buttons.
3. **Rules, not boxes.** Every card title sits on a thin dark rule (1.5px). Inside tables, only hairlines.
4. **Data first.** Big bold numbers, tiny UPPERCASE grey labels, a coloured bar to the left of each stat.
5. **Dark primary actions.** Primary buttons and the active toggle segment are near-black with white text.
6. **Calm.** Small radii, soft shadows, no gradients except the page background, no hover lift, motion only for entry.

---

## 2. Design tokens

Defined once in `app/globals.css` as CSS variables and mapped to Tailwind utilities. Never hard-code hex values in components.

### 2.1 Colour

| Token | Value | Use |
| --- | --- | --- |
| `--bg-from / via / to` | `#f1f1f0 / #e7e7e6 / #dcdcdb` | Page background gradient (160deg) |
| `--surface` | `#f6f6f5` | Cards |
| `--surface-strong` | `#ffffff` | Drawers, menus, inputs |
| `--surface-muted` | `#ececeb` | Nested tiles, avatars, empty-state icon |
| `--sidebar` / `--sidebar-active` | `#e4e4e3` / `#f3f3f2` | Sidebar panel / active item |
| `--text` | `#1c1c1c` | Primary text, rules, primary buttons |
| `--text-muted` / `--text-faint` | `#6e6e6e` / `#9a9a9a` | Labels / placeholders |
| `--divider` | `rgba(28,28,28,0.12)` | Hairlines, input borders |
| `--rule` | `#1c1c1c` | The 1.5px rule under titles |
| `--accent` | `#ede063` | Yellow: stat bars, chart fill, "hot" chips |
| `--accent-strong` | `#ddd04a` | Accent hover |
| `--accent-soft` / `--accent-ink` | `#f6f1b8` / `#1c1c1c` | Selected rows, icon circles, text on accent |
| Greys for charts | `#6f6f6f`, `#a8a8a8`, `#2b2b2b`, `#d0d0d0` | Second to fifth chart series (exposed as `cat-blue`, `cat-orange`, `cat-lavender`, `cat-grey`) |
| Status | positive `#3f8f4a`, negative `#d9534f`, warning `#d99a1e`, info `#4f74c8` (each with a pale `-soft`) | Status chips and trends only |

**Status → chip mapping (unchanged):** Active = positive, Expiring Soon = warning, Expired / Lapsed = negative, Quote Sent = info, Pending = grey, Renewed = yellow (solid accent).
**Category colours in charts:** Car = yellow, Two Wheeler = dark grey, Health = mid grey, Term = near-black, Other = light grey.

### 2.2 Typography
Inter (`next/font`), numbers use tabular figures. Weights: 400 body, 500 labels, 600 titles, 700 big numbers and page title.

| Role | Size | Weight |
| --- | --- | --- |
| Page title | 24px | 700 |
| Card title | 15px | 600 |
| Big stat number | 22–28px | 700 |
| Body | 14px | 400 |
| Stat label / table header | 10px, UPPERCASE, +0.06em tracking | 600, muted |
| Chip | 10px, UPPERCASE | 600 |

### 2.3 Radius, shadow, spacing
Radius: card `12px`, nested tile `8px`, control (input, button) `6px`, chip `3px`, nav item and segmented control `4px`, avatar full.
Shadow: `0 2px 12px rgba(0,0,0,0.06)` (cards), `0 8px 24px rgba(0,0,0,0.10)` (drawers, menus).
Spacing: 4, 8, 12, 16, 20, 24. Card padding 20px (16px for stat tiles). Grid gap 16px. Deliberate exceptions: compact banner cards `p-4`, hero and empty-state cards (import steps, claim portal) `p-6`/`p-8`, and public-portal touch controls `h-11`.
No other shadows: only `shadow-card` and `shadow-card-hover`. Never `shadow-sm`, `shadow-md` or `shadow-xs`.

---

## 3. Layout

- **Sidebar:** 240px, rounded panel in `--sidebar`, floating 16px from the edge. Top: dark logo square plus "SecureDrive" and "CRM". Text navigation (icon + label, 13px) organized into four logical groups separated by hairlines:
  1. *Core Operations:* Dashboard, Clients, Policies, Renewals, Claims, Quote Requests
  2. *Tools & Analytics:* Data Grid, Data Transfer, Reports
  3. *Platform & Communications:* Notifications, Placements, Support, Ad Controls
  4. *Settings:* Staff Accounts & RBAC
  Active item: `--sidebar-active` background, bold text. Sign out at the bottom.
- **Top bar:** page title (24px, bold) on the left; search, bell and account menu on the right; a full-width 1.5px dark rule underneath.
- **Content:** max width 1440px, 12-column feel, 16px gaps. Dashboard: row of 4 stat cards, then chart and category cards, then the upcoming list.
- **Responsive:** below 1024px the sidebar becomes a bottom bar showing 5 primary shortcuts (Dashboard, Clients, Policies, Renewals, Claims); cards stack below 640px.

---

## 4. Components

- **Card:** `--surface`, 1px white border, radius 12, soft shadow, padding 20. No hover lift. Title row = title left, optional controls right, then the 1.5px dark rule, then content.
- **Stat tile:** 3px left bar (yellow on even tiles, grey on odd), big bold number, UPPERCASE label below, optional trend line (green up, red down), small muted icon top-right.
- **Segmented control:** 1px dark border, 4px radius, active segment near-black with white text, inactive transparent. Used for Week/Month/Year and tab filters.
- **Buttons:** Primary = near-black, white text, radius 6, height 40. Secondary = white with hairline border. Ghost and icon = transparent, hover `accent-soft`. Danger = negative-soft. Yellow is never a button colour (white text is unreadable on it).
- **Inputs:** height 40, radius 6, white 80%, hairline border, dark-yellow focus border (`accent-strong`) plus focus ring. Touch-focused public portals (`/claim`) use `h-11` (44px) touch targets for high ergonomics.
- **Dropdowns (`CustomSelect`):** one custom dropdown everywhere across the CRM (zero unstyled native `<select>` tags). Height 40 (or 44 for touch), radius 6, white background, hairline border, dark-yellow focus ring (`accent-strong`). Includes live filter search (when options $\ge 6$ or `searchable`), universal typeahead jump on closed or compact selects, portal-rendered to `document.body` with automatic viewport flip (opens upwards when below space < 260px). Form-transparent via hidden input for native Server Actions `FormData` compatibility.
- **Date picker and calendar (`DatePicker`):** one custom calendar everywhere (never the browser's native date input). Field shows the date as `20 Nov 2026` with a calendar icon; the panel opens in a floating layer with Monday-first weeks. Selected day = near-black square, range days = soft-yellow band, today = small yellow dot. Click the title for a month grid, again for a year grid. Footer: Today and Clear. Filters offer a Single day / Date range toggle.
- **Virtual Data Grid (`/data-grid`):** high-volume spreadsheet-like interface. Keyset pagination, virtual scrolling, inline cell editing with instant keyboard navigation (Tab/Shift-Tab/Enter), sticky smart-headers with sorting/filtering, multi-row selection, CSV/XLSX export.
- **Bulk Data Transfer (`/import`):** multi-format ingestion (Excel .xlsx, CSV, JSON), auto-matching column mapper with sample previews, client-side batch chunking (Vercel serverless-safe), import audit history.
- **Role-Based Access Control (`/settings`):** tabbed administration (Staff Accounts & Roles/Permissions). Granular module permission checkboxes, 3-state per-staff overrides (Inherit, Grant [+], Revoke [-]), dynamic RLS function integration.
- **Public Claim Portal (`/claim`):** standalone public agent portal outside the dashboard shell. Protected by shared access code gate, Indian license plate lookup with instant policy match, touch-friendly `h-11` inputs, positive/warning verification flow.
- **Loaders (by how long the wait is):**
  - Under about 1 second: no loader. Status buttons show the new choice at once (optimistic) and the clicked button carries a small spinner only while it saves.
  - 1 to 3 seconds (saving a form, a row action): `Button loading` puts a spinner in front of the label and blocks double clicks; form fields are dimmed and locked; a table row being changed is dimmed.
  - Longer or unmeasurable (uploads, sending to many users): `PendingBar`, a thin moving bar that appears only after 0.4 s, so quick saves never flash. No percentage bars unless real progress is known.
  - Page changes: the top progress bar plus skeleton screens (`loading.tsx`). Never a full-page spinner.
  - Components: `Spinner`, `Button loading`, `PendingBar`, `useDelayedFlag`, `Skeleton`.
- **Chips:** 3px radius, 10px UPPERCASE bold. Soft background plus coloured text, except `Renewed`, which is solid yellow with dark text.
- **Tables:** inside a card. Header = 10px UPPERCASE muted labels with a hairline under it (`border-b border-divider`, never the dark 1.5px rule, which belongs only under card titles). Header cells and body cells share the same horizontal padding so labels line up with data. Rows 56px with hairline dividers, hover `accent-soft` at 40%. Avatars are grey circles with initials. The Data Grid is the one dense exception: 44px rows, 12px text.
- **Charts:** Recharts. Bars use yellow on a pale grey track, rounded tops, grid lines use `var(--divider)`. Donut and legend use the grey scale plus yellow. White tooltip card.
- **Drawer / modal:** white, radius 12, overlay `rgba(28,28,28,0.35)`, forms in a right-side 480px drawer.
- **Empty state:** muted icon in a grey circle plus one short label. Loading uses skeleton blocks.
- **Icons:** Lucide, outlined, 1.75px stroke, 16–18px.

---

## 5. Motion
Entry fade plus 8px slide (250ms, 40ms stagger), number count-up once. Nothing else. Respect `prefers-reduced-motion`.

---

## 6. SecureDrive content mapping
Sidebar modules:
- **Core Operations:** Dashboard, Clients, Policies, Renewals, Claims, Quote Requests
- **Tools & Analytics:** Data Grid, Data Transfer, Reports
- **Platform & Communications:** Notifications, Placements, Support, Ad Controls
- **System Settings:** Settings (Staff Accounts & Roles & Permissions tabs)
- **Public Agent Portal:** `/claim` (access code gated claim submission)

Dashboard: Active Policies, New Clients, Renewal Revenue, Renewal Rate; Renewals due (bar); Policies by Category (donut); Upcoming Renewals (list).

---

## 7. Rules for Claude (and any developer)

**Do:** use tokens and the components above; add a missing component here first; format money as INR (`₹1,17,500`) and dates as `13 Nov 2026`; keep every icon-only button labelled; leave data empty rather than inventing placeholder values.

**Don't:** use hard-coded colours; make yellow buttons or large yellow areas; add dark mode, hover lifts, gradients (except the page background), mixed icon sets or new fonts (no `font-mono`: plates and IDs use Inter bold, uppercase, tabular figures); use more than one primary button per card or form; use pure black `#000`; use native `<select>` or `<input type="date">` (use `CustomSelect` and `DatePicker`); use `alert()` (use `toast`); nest `rounded-card` inside a card (use `rounded-tile`); put a `<Button>` inside a `<Link>` (use `buttonStyles` on the `Link`); hand-build chips, segmented toggles or spinners (use `Chip`, `Segmented`, `Spinner`).

**Class names:** `cn()` is `twMerge(clsx())`, so an override such as `h-8 px-3 text-xs` really replaces a component's default `h-10 px-4 text-sm`. Native checkboxes and radios take the ink colour from one global rule in `globals.css`. Labels above fields are `text-xs font-medium text-ink-muted`.

**Copy:** screens must not claim things the system does not do (for example "monitored" or "encrypted channel"). Keep wording factual.

---

## 8. File structure (crm/)
```
design.md
proxy.ts                 ← session refresh and sign-in redirect
app/globals.css          ← tokens
app/login/               ← login page and actions
app/(dashboard)/         ← shell layout and one folder per module
components/ui/           ← Card, StatCard, MiniStat, Chip, Button, Segmented, Drawer, Field, EmptyState
components/charts/       ← BarChartCard, DonutChart, ChartTooltip
components/layout/       ← Sidebar, Topbar, LoginForm
components/modules/      ← ModulePage (toolbar, table, drawer form)
lib/                     ← format, status, options, nav, auth, supabase/
```
