# SecureDrive CRM — Comprehensive Handoff & Claude Code Guide
*Updated on 10 Nov 2026. For Claude Code CLI or next LLM session.*

---

## 1. Executive Summary & Slicing Status

This document is the authoritative handoff for the **SecureDrive CRM** integration project located at `c:\Users\Mohit\Desktop\securedrive\crm`.

### Slicing Progress Matrix:

| Slice | Module / Feature | Status | Notes |
|---|---|---|---|
| **S1** | RBAC seam & navigation registry | ✅ **Done** | `lib/rbac/permissions.ts`, `lib/rbac/server.ts`, dynamic sidebar |
| **S2** | Migration `0008` (Policy & Claims schema) | ✅ **Done** | Executed in Supabase (`policies`, `claims`, `staff_users` extensions) |
| **S3** | Legacy data migration script | 🗑️ **Skipped** | Skipped by user directive |
| **S4** | Policies merge (Vehicle fields, Edit, Delete) | ✅ **Done** | Vehicle fields integrated into Add Policy, Edit Policy drawer, Admin Delete |
| **S5** | Staff merge (Employee code, Designation, Login toggle) | ✅ **Done** | Upgraded staff cards, no-login agents support |
| **S6a** | Claims admin queue (`/claims`) | ✅ **Done** | ModulePage with approve/reject workflow & stats cards |
| **S6b** | Public claim portal (`/claim`) | ✅ **Done** | Responsive 2-step portal: access code gate, Indian plate lookup, verification |
| **S7** | Virtual Data Grid (`/data-grid`) | ✅ **Done** | Keyset pagination, virtual scrolling, inline editing, header sorting/filtering, CSV/XLSX export |
| **S8** | Bulk Import / Export (`/import`) | ✅ **Done** | Client-side chunking (Vercel 4.5MB safe), Excel/CSV/JSON, column mapper, batch tracking |
| **S9** | Duplicate scanner tool (`/tools/duplicates`) | 🗑️ **DROPPED** | Explicitly cancelled by user |
| **S10** | Policy summary PDF generator | 🗑️ **DROPPED** | Explicitly cancelled by user |
| **S11** | Command palette (`Ctrl+K`) | 🗑️ **DROPPED** | Explicitly cancelled by user |
| **S12** | Custom fields manager (`/settings/custom-fields`) | 🗑️ **DROPPED** | Explicitly cancelled by user |
| **S13** | Full RBAC Switch-On (Roles, DB, Overrides, RLS) | ✅ **COMPLETE** | SQL migration `0010`, dynamic roles table, 3-state overrides drawer, runtime enforcement |
| **UI-1** | Global CustomSelect rollout | ✅ **COMPLETE** | Unified custom dropdown across all CRM forms, filter toolbars, drawers & mapper |
| **UI-2** | Comprehensive UI & Design Audit Fixes | ✅ **COMPLETE** | All audit bugs resolved, design tokens restored, 0 TypeScript errors, clean production build |
| **S14** | Cutover & Final Polish | ⏳ **NEXT** | End-to-end user acceptance testing, old CRM archival |

---

## 2. Details of Key Work Completed in This Session

### A. Full RBAC Switch-On (Slice S13)
- **Database (`supabase/migrations/0010_rbac_roles_permissions.sql`)**:
  - `roles` table: System roles (`Admin`, `Staff`) and custom roles created by admin.
  - `role_permissions` table: Maps each role to granular keys (`policies.view`, `claims.create`, etc.).
  - `staff_custom_permissions` table: Per-staff overrides (`granted = true` to give extra, `granted = false` to revoke).
  - `staff_users.role_id`: Dynamic foreign key linking staff to roles.
  - `get_staff_permissions(user_id)`: SQL security function for RLS checks.
- **Runtime Permission Engine (`crm/lib/rbac/permissions.ts` & `crm/lib/auth.ts`)**:
  - `Subject` updated with `permissions?: string[] | null` and `role_id?: string | null`.
  - `can(subject, permission)` checks admin bypass, evaluates dynamic permissions array, and falls back gracefully.
  - `getStaff()` in `lib/auth.ts` resolves effective permissions in a single session fetch.
- **Admin UI (`crm/components/modules/rbac/`)**:
  - Tabbed shell at `/settings` using `Segmented`: Tab 1 = Staff Accounts, Tab 2 = Roles & Permissions.
  - `RoleEditorDrawer`: Create/edit custom roles with module-wise permission checkboxes.
  - `StaffPermissionsDrawer`: 3-state toggles (Inherit from Role, Grant [+], Revoke [-]) per employee.

### B. Global Theme-Aligned Custom Dropdown (`CustomSelect`)
- **Master Component (`crm/components/ui/custom-select.tsx`)**:
  - Replaces all unstyled browser `<select>` elements across the CRM.
  - Built strictly to match `crm/design.md`: 6px control radius (`rounded-control`), 8px panel radius (`rounded-tile`), `#ede063` yellow accent highlights, dark `#1c1c1c` text, hairline borders (`border-divider`).
  - **Live Filter Search**: Auto-focused search input when `searchable` is true or options $\ge 6$. Keystrokes filter options in real time. <kbd>Enter</kbd> selects the top match.
  - **Universal Typeahead Jump**: On compact selects, typing characters buffers for 700ms and immediately highlights/scrolls to matching options. When closed, typing directly updates selection.
  - **Portal-Rendered**: Mounted via `createPortal(..., document.body)` with `z-[80]` and smart viewport flip (opens above when space below < 260px). Never clipped by drawers, cards, or tables.
  - **Form Transparent**: Hidden `<input name={name} value={selectedValue} />` ensures native server action `FormData` compatibility.

### C. Comprehensive UI Consistency & Quality Audit Fixes
Every issue identified during the deep consistency audit has been addressed and verified:

1. **Dependency Fixed**:
   - Installed `tailwind-merge` (`twMerge(clsx(inputs))` in `lib/cn.ts`).

2. **Data Grid (`/data-grid`)**:
   - `smart-header.tsx`: Outside-click handler updated to ignore clicks within portals (`[role="dialog"]`, `[role="listbox"]`, `.pop-in`), preventing premature unmounting when interacting with DatePicker or CustomSelect.
   - `smart-header.tsx`: Replaced undefined `shadow-elev-2` with `shadow-card-hover`; normalized container to `rounded-tile` and inner buttons/inputs to `rounded-control`.
   - `virtual-grid.tsx`: Fixed loader row `colSpan` calculation from `15 + customFields.length` to `16 + customFields.length`.
   - `virtual-grid.tsx`: Fixed HTML validation error where `<Button>` was rendered inside `<Link href="/policies">` by using `<Link className={buttonStyles("secondary", ...)}>`.
   - `virtual-grid.tsx`: Replaced all raw browser `alert()` invocations with CRM `toast(..., "error")`.
   - `virtual-grid.tsx`: Formatted Due Date column with `formatDate(record.dueDate)` (was raw ISO string).
   - `virtual-grid.tsx` & `inline-cell.tsx`: Replaced all raw `Loader2` spinners with the CRM design-system `<Spinner />` component; replaced `shadow-md` with `shadow-card`.

3. **RBAC & Staff Settings (`/settings`)**:
   - `role-editor-drawer.tsx`: Fixed input heights to `cn(CONTROL, "h-10")`; replaced `rounded-card` with `rounded-tile`; removed `font-mono`; added missing `cn` import.
   - `staff-permissions-drawer.tsx`: Replaced `rounded-card` with `rounded-tile`; removed `font-mono` and `shadow-xs`; converted toggle buttons to `rounded-control`.
   - `staff-table-with-rbac.tsx`: Fixed role mapping deduplicating base system roles `Admin` & `Staff`.
   - `module-page.tsx`: Fixed rowAction toast firing "Done." on drawer open by checking `if (result.message) toast(...)`.
   - `roles-table.tsx`: Replaced raw `alert()` calls with `toast()`; aligned table headers with table cells (`px-4`); removed double dark rule (`border-b border-divider`); replaced hand-made "All Access" badge with `<Chip tone="positive">`.

4. **Data Import & History (`/import`)**:
   - `column-mapper.tsx`: Replaced raw `alert()` calls with `toast()`; aligned table headers with table cells (`px-4`); removed double dark rule; removed `font-mono` on sample values; replaced `Loader2` with `<Spinner size={32} />`; replaced `rounded-card` with `rounded-tile`.
   - `import-history.tsx`: Aligned headers with cells (`px-4`); replaced double dark rule with hairline; replaced invented fallback placeholders ("Admin", "Import") with `"—"`; removed `font-mono`.
   - `bulk-lookup.tsx`: Export format toggle uses `Segmented`; container uses `rounded-tile`; removed `font-mono`.

5. **Public Claim Portal (`/claim`)**:
   - `page.tsx`: Removed redundant vertical gradient (inherits canonical 160deg background from `globals.css`); replaced hand-made badge with `<Chip tone="accent">Agent Portal</Chip>`.
   - `claim-portal.tsx`: Replaced Step 1 and Step 2 badges with `<Chip tone="accent">Step 1 of 2</Chip>` and `<Chip tone="accent">Step 2 of 2</Chip>`.
   - License plate input (`regInput`) and success receipt: Removed `font-mono`; styled with Inter bold uppercase and tabular numbers (`tabular-nums font-bold uppercase tracking-wider`).
   - Access code input: Removed `font-mono`, using clean Inter with `tracking-widest`.

6. **Charts & Navigation**:
   - `components/charts/bar-chart-card.tsx`: Replaced hard-coded `stroke="rgba(27, 34, 56, 0.06)"` with design-system token `var(--divider)`.
   - `lib/nav.ts` & `components/layout/sidebar.tsx`: Reorganized sidebar navigation into four logical groups separated by hairlines:
     1. Core Operations (6 items): Dashboard, Clients, Policies, Renewals, Claims, Quote Requests
     2. Tools & Analytics (3 items): Data Grid, Data Transfer, Reports
     3. Platform & Communications (4 items): Notifications, Placements, Support, Ad Controls
     4. Settings (1 item): Settings
   - Mobile navigation: Bottom bar directly exposes the 5 primary operational shortcuts: Dashboard, Clients, Policies, Renewals, Claims.
   - `crm/design.md`: Fully updated with specifications for `CustomSelect`, `DatePicker`, touch-friendly `h-11` public portals, Data Grid, Bulk Import, and RBAC Settings tabs.

---

## 3. UI Consistency & Design System Reference Guide

### Source of Truth Files:
1. **Design Tokens & Rules**: [`crm/design.md`](file:///c:/Users/Mohit/Desktop/securedrive/crm/design.md)
   - Canvas: Neutral grey gradient (`#f1f1f0 / #e7e7e6 / #dcdcdb`).
   - Cards: Surface `#f6f6f5`, 1px white border, radius 12px (`rounded-card`), soft shadow (`shadow-card`), padding 20px. Title sits above a 1.5px dark rule (`border-b-[1.5px] border-rule`). Inside tables: only hairlines.
   - Controls: Height 40px, radius 6px (`rounded-control`), background `white/80` or `white`, border `border-divider`, focus border `border-accent-strong` + ring `ring-2 ring-accent-strong/20`.
   - Touch Portals: Touch targets use height 44px (`h-11`).
   - Accent: Exactly ONE accent color: Yellow (`#ede063`, soft `#f6f1b8`, hover `#ddd04a`). Never used as large button backgrounds (white text is unreadable on yellow).
   - Primary Buttons: Near-black (`bg-ink text-white hover:bg-ink/90`), radius 6px, height 40px.
   - Chips: Radius 3px (`rounded-xs`), 10px UPPERCASE bold (+0.06em tracking).
   - Typography: Inter (`next/font`), tabular numbers for currency and dates (`tabular-nums`). Zero rogue `font-mono`.

2. **Benchmark UI Components**:
   - Dropdowns: [`crm/components/ui/custom-select.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/custom-select.tsx)
   - Date Pickers: [`crm/components/ui/date-picker.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/date-picker.tsx) & [`crm/components/ui/calendar.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/calendar.tsx)
   - Segmented Controls: [`crm/components/ui/segmented.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/segmented.tsx)
   - Card Headers: [`crm/components/ui/card.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/card.tsx)
   - Chips & Badges: [`crm/components/ui/chip.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/chip.tsx)
   - Form Fields: [`crm/components/ui/field.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/field.tsx)
   - Stat Cards: [`crm/components/ui/mini-stat.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/mini-stat.tsx) & [`crm/components/ui/stat-card.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/stat-card.tsx)
   - Drawers: [`crm/components/ui/drawer.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/drawer.tsx)

---

## 4. Claude Code Resuming Prompt

Copy and paste the exact prompt below into Claude Code to resume the task seamlessly:

```markdown
Hello Claude! Please resume work on the SecureDrive Insurance CRM project (`c:\Users\Mohit\Desktop\securedrive\crm`).

### Context & What Has Been Done:
1. **Completed Slices**:
   - S1 (RBAC seam), S2 (Migration 0008), S4 (Policies vehicle fields & delete), S5 (Staff extension & no-login agents).
   - S6a (Claims admin `/claims`), S6b (Public claim portal `/claim`).
   - S7 (Virtual Data Grid at `/data-grid`).
   - S8 (Bulk Import/Export at `/import`).
   - S13 (Full RBAC switch-on: migration `0010`, dynamic roles, per-staff overrides drawer, RLS).
   - UI: CustomSelect component (`components/ui/custom-select.tsx`) implemented and rolled out globally across all form drawers, filter toolbars, document actions, import mapper, and claim portal.
   - UI Audit & Polish: Comprehensive design audit completed. All UI inconsistencies, rogue monospace fonts, raw alerts, unaligned table headers, and loader spinners have been unified to `crm/design.md` specifications.
2. **Cancelled / Dropped Slices (DO NOT IMPLEMENT)**:
   - S9 (Duplicate tool) — DROPPED by user.
   - S10 (Policy summary PDF) — DROPPED by user.
   - S11 (Command palette Ctrl+K) — DROPPED by user.
   - S12 (Custom fields manager) — DROPPED by user.
3. **Reference Documents**:
   - `HANDOFF_FOR_CLAUDE.md`: Authoritative handoff guide in the root directory.
   - `crm/design.md`: The design system ground truth (Hudson neutral grey + yellow accent).
4. **Current Status**:
   - `npx tsc --noEmit` runs with **0 errors**.
   - Zero native `<select>` or `<input type="date">` in use.

### Your Current Task (Slice S14 - Cutover & Final Polish):
1. Review the running CRM (`npm run dev`) across all routes:
   - `/` (Dashboard)
   - `/policies`, `/clients`, `/renewals`, `/quotes`, `/claims`
   - `/data-grid`
   - `/import`
   - `/claim` (Public Claim Portal)
   - `/settings` (Staff accounts & RBAC tabs)
2. Verify interactive workflows (e.g. creating a policy, submitting a claim via `/claim`, reviewing it in `/claims`, testing role permission overrides in `/settings`).
3. Prepare the final cutover steps and confirm readiness for production deployment.
```
