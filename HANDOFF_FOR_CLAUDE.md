# SecureDrive CRM — Comprehensive Handoff & Claude Code Guide
*Updated on 10 Nov 2026 (through RBAC H2.1–H2.8 Security Hardening; apply SQL migrations `0011` + `0012` in Supabase). For Antigravity, Claude Code CLI or any next LLM session.*

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
| **UI-3** | Final UI pass (audit leftovers) | ✅ **COMPLETE** | Verified cleanly with `npm run typecheck` and `npm run build` |
| **BF-1** | Module bug fixes (H3–H7 & pagination/export) | ✅ **COMPLETE** | Batched import/safe undo, grid keyset/filters/FK sync, claims RBAC/edit/delete/ref, push + templates, placement media/clock, list pagination + CSV export |
| **UI-4** | Hudson scrollbar polish & 1st-click nested forms | ✅ **COMPLETE** | Global subtle scrollbars/overflow cleanup; post-commit `onValueChange` + `showWhen` immediate evaluation + `<div>` wrappers around portal controls + `form.reset()` sync |
| **UI-5** | Tactile Micro-Interactions & Confirm Popovers | ✅ **COMPLETE** | Replaced all `window.confirm()` with `ConfirmButton`, sliding pill indicators (`Segmented`/`StatusButtons`/`VerificationControl`), button press + `Saved ✓` morph, toast exit + hairline timer + pause-on-hover, `CopyButton`, `showWhen` reveal, error shake/focus, drawer unsaved guard, row/cell commit flash, Data Grid bulk dock, drag-drop upload & Claim Portal transitions |
| **UI-6** | Insurer Dropdown (`logo_url`) & Global Search | ✅ **COMPLETE** | DB-backed `insurers` `CustomSelect` + `InsurerLogo`/`InsurerBadge` + `"Other / Add new"` `showWhen` flow across Policies/Renewals; live RBAC-aware `GlobalSearch` (grouped popover, keyboard nav, mobile dialog, `?q=` `ModulePage` handoff) |
| **S14** | Cutover & Final Polish | 🚧 **IN PROGRESS** | RBAC H2.1–H2.8 hardened in code & `0012` SQL (run `0011`+`0012` in Supabase); remaining: mobile sync/OTP/reminders, Reports charts, placement slot lock after mobile build |

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

### D. Final UI pass (UI-3) & Bug-Fix Pass (BF-1)
UI-3 leftovers and all requested module bug fixes (H3, H4, H5, H6, H7, and cross-cutting list pagination/export) have been implemented and verified with `npm run typecheck` (0 errors) and `npm run build` (19/19 routes built cleanly).

#### Key Fixes in BF-1:
- **H3 Bulk Import & Lookup (`lib/actions/import.ts`, `lib/import-fields.ts`, `column-mapper.tsx`, `bulk-lookup.tsx`)**:
  - Replaced per-row queries in `importChunk` with batched chunk reads/inserts (insurers, users, policies) and bounded parallel updates.
  - Fixed `updateExisting` payload so unmapped/blank columns (`vehicle_category`, `due_date`, `idv`) never overwrite existing data with defaults; added `vehicle_mfy`, `rto_location`, `pin`, `pin_2` end-to-end; removed `rto_location` forcing `4W`; added `warnings` summary for defaulted insert dates and invalid mobiles.
  - Fixed `undoImportBatch` cascade bug using batched queries without PostgREST `.neq` NULL traps — preserves clients with remaining policies or `auth_user_id`.
  - Upgraded `bulkLookupPolicies` & `BulkLookup` to report and copy `unmatched` identifiers and sanitize CSV exports against formula injection.
- **H4 Data Grid (`lib/data/data-grid.ts`, `lib/actions/data-grid.ts`, `virtual-grid.tsx`, `smart-header.tsx`, `inline-cell.tsx`)**:
  - Fixed keyset pagination across all sortable columns (`GridCursor = { sortValue, id }`, preserving `nullsFirst: false` and `created_at` sort support).
  - Enabled `"vehicle_category"` (Type), `"status"` (date-range mapped), `"type"`, and `custom_data->>key` filters in shared `applyGridFilters` used by both `getGridPage` and `exportGridCsv`.
  - Fixed inline edits: syncs `insurer_id` FK from `insurers`, keeps `due_date` synced to the earlier of `(saod_due_date, tp_due_date)` (and updates local row state), normalizes `holder_mobile` to `+91...`, uses `dbMessage`, and surfaces `res.error` in `InlineCell`.
  - Paged `exportGridCsv` across PostgREST 1,000-row chunks up to 10,000, neutralized CSV formula injection, and reported truncation in toast.
- **H5 Claims (`lib/data/claims.ts`, `lib/actions/claims.ts`, `claims/page.tsx`, `claim-portal.tsx`, `lib/actions/claim-portal.ts`)**:
  - Stopped `getAgentOptions()` staff leak and enforced self-crediting in `createClaim` for non-admin staff.
  - Added pending claim **Edit drawer** (`updateClaim`), admin-only **Delete** on rejected claims (`deleteClaim`), explicit `verification_status: "verified"` on claim-created policies, and `CLM-XXXXXXXX` Reference IDs with Copy button in `/claim` portal + searchable `Ref` column on `/claims`.
- **H6 Notifications & Push (`supabase/functions/send-push/index.ts`, `lib/actions/notifications.ts`, `notifications-shell.tsx`)**:
  - Implemented `send-push` Edge Function (Expo Push API + `DeviceNotRegistered` token pruning) and wired real Expo Push dispatch directly inside `sendNotification` alongside `notifications` feed writes (reporting honest delivery/token status).
  - Built full **Notification Templates** CRUD tab + optional template selector in `New Notification`, plus `deleteNotification` row action and safe `.limit(2)` user lookup.
- **H7 Placements (`lib/actions/engagement.ts`, `lib/data/engagement.ts`, `placements/page.tsx`, `0011_placements_db_now.sql`)**:
  - Added `imageUrl` (`image_url` thumbnail + URL validation) and `sortOrder` (`sort_order`) fields to create/edit/table.
  - Added `get_db_now()` RPC migration (`0011_placements_db_now.sql`, with graceful fallback to `Date.now()`) to avoid clock drift between CRM status display and mobile RLS.
  - Kept `slot_name` flexible (`[a-z0-9_]{2,40}`, suggestions `home_banner` + existing slots) as directed — final slot lock deferred until mobile app build completes.
- **Cross-Cutting Pagination & CSV Export (`lib/data/helpers.ts`, `module-page.tsx`, all `lib/data/*` & list pages)**:
  - Added `pagedRows()` `.range()` paging helper across Clients, Policies, Renewals, Claims, Quotes, Notifications, Placements, Support, and Ad-free Users (breaking the 1,000-row PostgREST cap up to 10,000 rows, with truncation notice + Data Grid link where exceeded).
  - Upgraded `ModulePage` with 50-row client pagination, filtered CSV export (`exportName`) with formula sanitization, `image` column rendering, `edit.showWhen`, and `defaultValues`.
- **Global Seamless Scrollbars & Overflow Cleanup (`globals.css`, `sidebar.tsx`, `role-editor-drawer.tsx`, `staff-permissions-drawer.tsx`, `virtual-grid.tsx`, `module-page.tsx`, `roles-table.tsx`, `import-history.tsx`, `column-mapper.tsx`, `design.md`)**:
  - Styled scrollbars globally with transparent tracks, no arrow buttons, `6px` charcoal-ink pills (`10px` hit target), and `scrollbar-width: thin`.
  - Removed nested inner scrollboxes inside RBAC drawers (now single-scroll with sticky bottom footer), tightened Sidebar rhythm to prevent scrollbars at 125%–150% zoom, reduced Data Grid `min-h` to `240px` to prevent double page+grid scrolling when zoomed in, and removed blanket `whitespace-nowrap` / forced `min-w` from standard tables to prevent unnecessary horizontal scrollbars.
- **UI-4 (1st-Click Nested Conditional Forms)**:
  - Fixed `CustomSelect` and `DatePicker` to fire post-commit `onValueChange` strictly after React commits the hidden `<input>` value to the DOM (StrictMode-safe + supports native `<form>.reset()`), replaced `<label>` wrappers around portal controls in `Field` and `ClaimPortal` with `<div>`, and updated `PrimaryForm` to merge explicit `(name, value)` updates and clear stale `watch` overrides on validation remounts.
- **UI-5 (Hudson Micro-Interactions & Custom Confirm Popovers)**:
  - Replaced every `window.confirm()` across the CRM (`ModulePage`, `DeletePolicyButton`, `DeleteDocumentButton`, `ImportHistory`, `RolesTable`) with portal-anchored [`ConfirmButton`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/confirm-button.tsx).
  - Shared [`useSlidingPill`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/use-sliding-pill.ts) indicator across `Segmented`, `StatusButtons`, and `VerificationControl`; added button press detent + `saved ✓` morph (`Button`, `Export CSV`, `BusinessProfileForm`, `DocumentUpload`); upgraded `Toaster` & `NotificationBell` live toasts with unified `rAF` `3px` countdown bars, hover pause, and bottom slide exit; added `CopyButton`; added smooth grid-row curtain `Drawer` discard guard + scroll-aware header rule; added `reveal-down` for dynamic `showWhen` fields, `micro-shake` + first-error auto-focus/scroll, row commit flashes, `InlineCell` save check + floating Data Grid bulk-action dock, smooth anti-flicker `300ms` dropzones (`ColumnMapper`, `DocumentUpload`, `BulkLookup`), and `ClaimPortal` step/status transitions.
- **UI-6 (DB Insurer Dropdown + Logos & RBAC Global Search)**:
  - Built [`InsurerLogo`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/insurer-logo.tsx) / `InsurerBadge` (renders `https://`/`/` `logo_url` or falls back cleanly to monogram initials on `null`/error), `getInsurers()` (`id, name, logo_url`), and `insurerFields()` (`lib/policy-fields.ts`) with searchable `CustomSelect` + `"Other / Add new insurer…"` conditional auto-create flow across **Add Policy**, **Edit Policy**, Policies table, Renewals table, and Policy Detail. Updating `public.insurers.logo_url` automatically lights up real logos across the CRM.
  - Built RBAC-enforced [`globalSearch`](file:///c:/Users/Mohit/Desktop/securedrive/crm/lib/actions/search.ts) and [`GlobalSearch`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/layout/global-search.tsx) wired via `DashboardLayout` -> `Topbar` (`allowed` permissions): debounced 200ms grouped popover + keyboard navigation (`/`, `↑↓`, `Enter`, `Esc`) + mobile spotlight dialog + `?q=` list handoff synced cleanly via `<Suspense>`-wrapped `SearchQuerySync` inside `ModulePage`.

### E. Known, deliberate or still-open items
- The permission 3-state toggle in `staff-permissions-drawer.tsx` is hand-built (Role / Grant / Revoke with green and red). It is an accepted exception to the "use `Segmented`" rule.
- Status colours on soft backgrounds (warning about 2:1, positive and negative about 3.4:1) are below WCAG AA for small text. This is a token decision in `globals.css`, not changed.
- Inline date editing in `DatePicker` opens automatically (`defaultOpen`) and cancels cleanly on Escape or blur without selection.
- The claim portal's wrong-code limiter is in server memory (per instance), so it slows guessing but is not a hard limit. Keep `CLAIM_PORTAL_CODE` long (8+ characters).
- Mobile push delivery works automatically on the CRM & Edge Function side, **but mobile app (`mobile/src`) still needs `expo-notifications` registration to populate `device_tokens`**.

### F. Setup checklist (do once per environment)
1. `npm install` in `crm/` (includes `tailwind-merge`).
2. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never `NEXT_PUBLIC_`), `CLAIM_PORTAL_CODE` (8+ characters), optional `EXPO_ACCESS_TOKEN`. Set them in `.env.local` and in Vercel.
3. Supabase migrations, in order: `0008_crm_integration_fixes.sql`, `0009_revoke_anon_app_settings.sql`, `0010_rbac_roles_permissions.sql`, `0011_placements_db_now.sql`, `0012_rbac_rls_hardening.sql` (apply `0011` & `0012` in Supabase SQL Editor). Check afterwards that `select table_name, privilege_type from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';` returns no rows.

### G. Working agreements (to save effort)
- Read `design.md` and the component you are about to change before editing. Prefer small, exact edits over rewriting whole files.
- No `alert()`, native `<select>`, native date inputs, `font-mono`, foreign shadows or hard-coded colours (see design.md section 7).
- Every new screen starts with `requirePermission(...)` and every server action with `authorize(...)` (see `lib/rbac`). Add new permissions to `lib/rbac/permissions.ts` first.
- The dropped slices S9 to S12 stay dropped.

---

### H. Module review: status & fixes (updated 10 Nov 2026)
Sections H3, H4, H5, H6, H7, and cross-cutting pagination/export were fixed in pass BF-1. Below is the accurate verified state of every module.

**H1. Project-level pending work (VERIFIED from folders and PROJECT.md / docs/mobile-sync-todo.md)**
- **Push notifications:** Backend & Edge Function (`supabase/functions/send-push/index.ts`) are now implemented and `sendNotification` dispatches to Expo Push API whenever `device_tokens` exist. Remaining: **mobile client (`mobile/src`) does not yet register Expo push tokens into `device_tokens`**, and `daily-reminders`, `send-whatsapp-otp`, and `verify-otp` Edge Function folders are still **empty**.
- **No automatic reminders.** The daily job (expiry at 60/30/15/7/1 days, birthdays, anniversaries; blueprint section 5.4) is not built, so renewals are only reminded manually.
- **WhatsApp OTP login is not built.** The mobile app signs in with Supabase TEST phone numbers (fixed code 123456). Needs a Meta business account, an approved authentication template, and the two OTP functions. An App Store demo account is also pending.
- **Mobile app is behind the CRM** (`docs/mobile-sync-todo.md`, items 1 to 5 not applied in the app): show `rejection_reason` on rejected policies and let users resubmit; new labels for policy source ("Insured by agency" / "External policy") and document source; quote statuses `pending` and `renewed`; open a policy from a notification via `policy_id`; read `app_settings` (support card, IRDAI licence, disclaimer) instead of hard-coded values.
- **Mobile items never verified on a device:** add/edit/delete policy form with document upload, FAQ chatbot, edit profile, terms/privacy screens (see `PROJECT.md`).
- **Not started:** real AdMob native cards and consent (needs an EAS dev build), real logo and app icon, privacy policy / DPDP text, IRDAI disclaimer, store forms.
- **Duplicate copies exist and can drift:** `crm/supabase/` (functions + migrations 0001 to 0011) duplicates the root `supabase/` folder, and there are two handoff files (`HANDOFF_FOR_CLAUDE.md` at the repo root and inside `crm/`). Pick one source of truth and delete the other.
- **Stale docs:** `PROJECT.md` still says the CRM is ON HOLD and lists the CRM as todo; `docs/mobile-sync-todo.md` still says Excel import must not start. Both are out of date (the CRM and `/import` exist).

**H2. RBAC (S13) security hardening — RESOLVED in code + migration `0012_rbac_rls_hardening.sql` (apply `0012` in Supabase SQL Editor)**
1. **RESOLVED (H2.1 — Overrides & single-RPC load):** `0012_rbac_rls_hardening.sql` adds `staff_custom_permissions_self_select` plus `security definer` `public.get_my_permissions()` (scoped to `auth.uid()`). `getStaff()` in `lib/auth.ts` resolves non-admin permissions via a single `get_my_permissions` RPC call (with `PGRST202`/`42883` pre-`0012` fallback reading `role_permissions` + `staff_custom_permissions`).
2. **RESOLVED (H2.2 — Database-level RLS enforcement):** `0012_rbac_rls_hardening.sql` adds `public.has_permission(p_permission text)` and replaces blanket `is_staff()` write/`_staff_all` policies across `staff_users`, `users`, `family_members`, `policies`, `policy_documents`, `storage.objects` (`DOCUMENTS`), `renewals`, `quote_requests`, `support_tickets`, `claims`, `notifications`, `templates`, `device_tokens`, `placements`, `ad_slots`, `ad_settings`, `app_settings`, `insurers`, `policy_types`, `import_batches`, and `grid_columns` while preserving mobile customer `_own` / `_read` policies.
3. **RESOLVED (H2.3 — Role deletion orphan guard):** `deleteRoleAction()` in `lib/actions/rbac.ts` refuses to delete any role that still has assigned staff (`staffCount > 0`).
4. **RESOLVED (H2.4 — Fail-closed `can()` & `role_id` assignment):** `can()` in `lib/rbac/permissions.ts` fails closed (`return permission === "dashboard.view"`) when a non-admin lacks an explicit loaded `permissions` array; `getStaff()` in `lib/auth.ts` leaves `permissions` `undefined` on lookup failure (and `[]` when loaded empty); `addStaff`/`updateStaff` in `lib/actions/staff.ts` always set system `role_id` for login staff (and `0012` backfills existing login `staff_users` missing `role_id`).
5. **RESOLVED (H2.5 — Last-admin / self-lockout / login-only guards):** `saveStaffPermissionsAction()` in `lib/actions/rbac.ts` rejects non-login agents (`!auth_user_id`), unknown `roleId`, self-role changes, and demoting the last active login admin, rolling back if override updates fail; the `"Permissions"` row action in `components/modules/rbac/staff-table-with-rbac.tsx` is shown only when `agentState === "login"`.
6. **RESOLVED (H2.6 — Default Staff seeds):** `0012_rbac_rls_hardening.sql` seeds `'placements.manage'`, `'ads.manage'`, `'settings.view'`, and `'settings.edit'` onto the system `'Staff'` role (`on conflict do nothing`).
7. **RESOLVED (H2.7 — Atomic role saves & catalog validation):** `0012_rbac_rls_hardening.sql` adds transactional `public.save_role_permissions(p_role_id uuid, p_permissions text[])` guarded by `has_permission('staff.manage')`; `lib/actions/rbac.ts` validates UUIDs and permission keys via `isValidPermissionKey()`, rolls back `createRoleAction` on `role_permissions` insert failure, and uses `save_role_permissions` (with snapshot restore fallback) in `updateRoleAction`.
8. **RESOLVED (H2.8 — RPC execute locking & `authorize()`):** `0012_rbac_rls_hardening.sql` revokes execute on `get_staff_permissions(uuid)` from `public`, `anon`, and `authenticated` (`service_role` only) and grants `get_my_permissions()` / `has_permission(text)` only to `authenticated`; all 5 actions in `lib/actions/rbac.ts` use `authorize("staff.manage")` instead of page-redirecting `requirePermission()`.

---

**H3. Bulk Import / Lookup (`/import`) — RESOLVED (with 1 accepted schema limitation)**
- ✅ **Fixed (H3.1):** `undoImportBatch` now batch-checks remaining `policies` (without `.neq` NULL traps) and `auth_user_id`; only unlinked orphan users with zero remaining policies are deleted.
- ✅ **Fixed (H3.3, H3.7, H3.8):** `updateExisting` payload builds strictly from provided/mapped values (`vehicle_category` fallback `"4W"` and `due_date` `+365` fallback only apply on new inserts; removed `rto_location` forcing `4W`; added `rto_location`, `pin`, `pin_2`, `vehicle_mfy` to mapper, synonyms, inserts, updates, and lookup exports; merges `custom_data`).
- ✅ **Fixed (H3.5, H3.6):** Rewrote `importChunk` with batched queries (insurers, users, existing policies) + batched 100-row inserts (with single-row error fallback) + 20-way parallel updates; removed `.maybeSingle()` duplicate crashes.
- ✅ **Fixed (H3.4, H3.9, H3.10):** Import summary reports warnings for defaulted insert dates and invalid mobiles; `bulkLookupPolicies` & `BulkLookup` return and allow copying unmatched identifiers plus CSV formula sanitization.
- ℹ️ **Open (low / schema design):** `undoImportBatch` still deletes only created rows and cannot roll back overwritten fields from updates because `import_batches` does not store row-level pre-update snapshots.

---

**H4. Data Grid (`/data-grid`) — RESOLVED**
- ✅ **Fixed (H4.1):** Keyset cursor now tracks `{ sortValue, id }` for every `SortField` (including `created_at` and `vehicle_category`), handling `nullsFirst: false` accurately; custom fields and computed `status` hide non-applicable sort toggles.
- ✅ **Fixed (H4.2):** Added `"vehicle_category"` (Type), `"status"` (date-range filter), `"type"`, and `custom_data->>key` filters in shared `applyGridFilters` used by both `getGridPage` and `exportGridCsv`.
- ✅ **Fixed (H4.3, H4.4, H4.7, H4.8):** Inline edits now sync `insurer_id` FK from `insurers`, sync `due_date` to the earliest of `(saod_due_date, tp_due_date)` (updating UI row immediately), normalize `holder_mobile` to `+91...`, surface `dbMessage` errors, and display `res.error` in `InlineCell`.
- ✅ **Fixed (H4.5, H4.6):** Quoted PostgREST `.or()` filter values and validated UUID cursors; `exportGridCsv` applies all active filters, pages across the 1,000-row PostgREST limit up to 10,000 rows, neutralizes Excel formula injection, and alerts when truncated.

---

**H5. Claims (`/claims` & `/claim`) — RESOLVED**
- ✅ **Fixed (H5.1):** `getAgentOptions(staff.id, isAdmin)` filters to `id = staff.id` for non-admin staff, and `createClaim` enforces `agentId = staff.id` server-side for non-admins.
- ✅ **Fixed (H5.2):** Uses `pagedRows()` + `ModulePage` pagination and filtered CSV export (`exportName="claims"`).
- ✅ **Fixed (H5.3, H5.7):** Added **Edit Claim** drawer (`updateClaim`, reviewer/admin on `pending` claims) and admin-only **Delete** action (`deleteClaim`, on `rejected` claims).
- ✅ **Fixed (H5.5, H5.6):** `approveClaim` explicitly sets `verification_status: "verified"`; both `/claim` portal and `/claims` now generate/display searchable `CLM-XXXXXXXX` reference IDs with one-click Copy on the portal confirmation card.
- ℹ️ **Note (H5.4):** Claim payment `amount` remains optional so `/claim` portal submissions without amounts work seamlessly; reviewers can fill amounts later via the new Edit Claim drawer.

---

**H6. Notifications (`/notifications` & Edge Function) — RESOLVED (pending mobile token registration)**
- ✅ **Fixed (H6.1):** Implemented `supabase/functions/send-push/index.ts` (and mirrored in `crm/supabase/functions/send-push/index.ts`) and wired `sendNotification` in CRM to dispatch Expo Push alerts to `device_tokens` and prune `DeviceNotRegistered` tokens, reporting accurate feed/push counts. Mobile app still needs `expo-notifications` token registration to populate `device_tokens`.
- ✅ **Fixed (H6.2):** Built Notification Templates CRUD tab (`Templates`) in `NotificationsShell` + optional `templateId` selection inside `New Notification` (`templates` stat tile is now live and functional).
- ✅ **Fixed (H6.3–H6.6):** Paged past 1,000 rows with `ModulePage` pagination & CSV export; added `deleteNotification` action; replaced `.maybeSingle()` with safe `.limit(2)` user lookup.

---

**H7. Placements (`/placements`) — RESOLVED (slot lock intentionally deferred)**
- ✅ **Fixed (H7.1):** Added Postgres `get_db_now()` RPC (`0011_placements_db_now.sql`) with fallback to `Date.now()` so placement `status` aligns with mobile RLS `now()`.
- ✅ **Fixed (H7.3, H7.4):** Exposed `imageUrl` (`image_url` URL validation + thumbnail column preview) and `sortOrder` (`sort_order`) in the table and Create/Edit drawer.
- ⏳ **Deferred by owner (H7.2):** `slot_name` intentionally remains flexible (`[a-z0-9_]{2,40}`, suggesting `home_banner` + existing slots) — **final slot names will be provided and locked after the mobile app build is finished**.

---

**H8. Reports (`/reports`) problems (OPEN — VERIFIED by reading `app/(dashboard)/reports/page.tsx`, `lib/data/admin.ts`)**
1. **HIGH, all four charts are not built.** The page renders four `Card` wrappers each containing `<EmptyState label="Not built yet" />`. The charts (Renewals by month, Policies by category, Clients vs general users, Commission) are placeholder shells.
2. **MEDIUM, Commission stat tile passes no value.** `<MiniStat … kind="inr" />` has no `value` prop — it will render `₹0`.
3. **LOW, `getReportStats()` reads policies twice.** Calls `countRenewalsDue` and separately counts total policies; could be combined.

---

**H9. Support (`/support`), Ad Controls (`/ads`), and Quote Requests (`/quotes`) problems (VERIFIED — corrected inaccuracies)**

**Support (`/support`, `app/(dashboard)/support/[id]/page.tsx`, `lib/data/engagement.ts`):**
- Detail page `/support/[id]` **DOES exist** and works (with `StatusButtons`, `Call`, `WhatsApp`, ticket description, and raised-by info).
- ✅ **Fixed:** Ticket list is now paged past 1,000 rows with `ModulePage` pagination & CSV export.

**Ad Controls (`/ads`, `lib/data/admin.ts`, `lib/actions/ads.ts`):**
1. **MEDIUM, `ad_slots` are seeded by SQL migration only.** No "Add slot" action in CRM UI yet.
2. **LOW, `setSlot` passes `slot_name` as action `id`.** Semantically odd vs UUID rows, though functional.
- ✅ **Fixed:** Ad-free user list is now paged past 1,000 rows with pagination & CSV export.

**Quote Requests (`/quotes`, `app/(dashboard)/quotes/[id]/page.tsx`, `lib/data/engagement.ts`):**
- Detail page `/quotes/[id]` **DOES exist** and works (with `StatusButtons`, `Call`, `WhatsApp`, client card, policy card, and documents).
- `category` chip renders via `chipFor`, which ALREADY maps to `"Car"`, `"Two Wheeler"`, etc. using `LABELS` in `lib/status.ts`.
- ℹ️ **Open (MEDIUM):** `getQuotes()` computes `completed` and `closed` counts which do not have dedicated stat tiles on `/quotes` (tiles show New / Pending / In Progress / Renewed).
- ✅ **Fixed:** Quote list is now paged past 1,000 rows with pagination & CSV export.

---

**H10. Cross-cutting issues — STATUS**
- ✅ **Fixed (H10.1):** Replaced `.limit(1000)` across `clients`, `policies`, `renewals`, `claims`, `quotes`, `notifications`, `placements`, `support`, and `ad_settings` with `pagedRows()` (`.range()` looping up to 10,000 rows), added 50-row table pagination, added filtered CSV export (`exportName`), and surfaced explicit truncation notices (plus `/data-grid` link on Policies) whenever total DB rows exceed 10,000.
- ✅ **Verified false alarm (H10.2):** `/support/[id]` and `/quotes/[id]` detail routes both exist and build cleanly.
- ℹ️ **Open (H10.3):** Sidebar still shows `Reports` as a full entry while charts say "Not built yet".

---

**H11. Remaining Priority Triage (updated after BF-1 fixes)**

| Priority | Item | Location / Notes |
|---|---|---|
| 🟢 Deploy pending | Apply Supabase migrations `0011_placements_db_now.sql` & `0012_rbac_rls_hardening.sql` in Supabase SQL Editor (all H2.1–H2.8 fixes implemented & `next build` verified) | `supabase/migrations/0011_*.sql`, `0012_*.sql` |
| 🟠 P2 — Next sprint | Reports page shows "Not built yet" for all 4 charts & Commission tile (H8.1–H8.2) | `app/(dashboard)/reports/page.tsx` + `lib/data/admin.ts` |
| 🟠 P2 | Deploy Edge Function `send-push`; build automated `daily-reminders` & WhatsApp OTP Edge Functions (H1) | `supabase/functions/` |
| 🟠 P2 | Mobile app needs `expo-notifications` registration into `device_tokens` + `docs/mobile-sync-todo.md` app screens sync (H1, H6.1) | `mobile/src`, `docs/mobile-sync-todo.md` |
| 🟡 P3 — After mobile build | Lock placement `slot_name` list once final mobile slots are confirmed (H7.2) | Pending owner input after app build |
| 🟡 P3 — Polish | Populate `public.insurers.logo_url` brand asset URLs; Ad slot create UI (H9); Quote completed/closed tiles (H9); deduplicate `crm/supabase` vs root `supabase` | `/insurers`, `/ads`, `/quotes`, `supabase/` |

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
   - Dropdowns: [`crm/components/ui/custom-select.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/custom-select.tsx) & [`crm/components/ui/insurer-logo.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/insurer-logo.tsx)
   - Date Pickers: [`crm/components/ui/date-picker.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/date-picker.tsx) & [`crm/components/ui/calendar.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/calendar.tsx)
   - Segmented Controls & Confirmations: [`crm/components/ui/segmented.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/segmented.tsx), [`crm/components/ui/confirm-button.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/confirm-button.tsx), [`crm/components/ui/copy-button.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/copy-button.tsx)
   - Global Search & Toasts: [`crm/components/layout/global-search.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/layout/global-search.tsx), [`crm/components/ui/toaster.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/toaster.tsx)
   - Card Headers: [`crm/components/ui/card.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/card.tsx)
   - Chips & Badges: [`crm/components/ui/chip.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/chip.tsx)
   - Form Fields: [`crm/components/ui/field.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/field.tsx)
   - Stat Cards: [`crm/components/ui/mini-stat.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/mini-stat.tsx) & [`crm/components/ui/stat-card.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/stat-card.tsx)
   - Drawers: [`crm/components/ui/drawer.tsx`](file:///c:/Users/Mohit/Desktop/securedrive/crm/components/ui/drawer.tsx)

---

## 4. Resuming Prompt (for Antigravity, Claude Code or any LLM)

Copy and paste the exact prompt below to resume the task seamlessly:

```markdown
Hello! Please resume work on the SecureDrive Insurance CRM project (`c:\Users\Mohit\Desktop\securedrive\crm`).

Read `crm/HANDOFF_FOR_CLAUDE.md` (or root `HANDOFF_FOR_CLAUDE.md`) and `crm/design.md` before modifying any file.

### Current Baseline (Verified Clean: `tsc --noEmit` + `next build`, commit `376f00b` on `main`):
- **Core Modules (`S1–S8`, `S13`) & Bug Fixes (`BF-1`):** RBAC admin/roles UI, Policies (with vehicle fields, Edit/Delete, Documents), Staff/Agents, Claims (`/claims` + `/claim` public portal with `CLM-` ref IDs), Data Grid (`/data-grid` keyset paging, filters, inline FK/due_date sync, CSV/XLSX export), Bulk Import & Lookup (`/import` batched chunks, safe undo, unmatched copy), Notifications (`send-push` Edge Function + Templates CRUD), Placements (`image_url`, `sort_order`, `get_db_now()` RPC), and `pagedRows()` + CSV export across all lists.
- **UI & UX Passes (`UI-1` through `UI-6`):**
  - Hudson design tokens, seamless custom scrollbars, and 1st-click `showWhen` nested form evaluation (`CustomSelect` / `DatePicker` post-commit `onValueChange` + `<form>.reset()` sync).
  - CRM-wide micro-interactions: zero `window.confirm()` (`ConfirmButton` popovers), gliding `useSlidingPill` indicators, `Button` press + `Saved ✓` morph, `Toaster` rAF hairline countdown & hover-pause, smooth `Drawer` unsaved-changes curtain, error `micro-shake` + first-error focus, row/cell commit flashes, Data Grid floating bulk dock, and flicker-free `300ms` drag-and-drop zones.
  - Database-backed **Insurer** `CustomSelect` with pre-built `InsurerLogo` (`logo_url` + monogram fallback) + `"Other / Add new"` flow.
  - Live RBAC-aware **Global Search** (`globalSearch` server action, desktop popover + mobile spotlight, `/`, `↑↓`, `Enter`, `Esc`, and `?q=` list sync in `ModulePage`).
- **Explicitly Dropped (do NOT build):** `S9` Duplicate scanner, `S10` Policy summary PDF, `S11` Command palette (`Ctrl+K`), `S12` Custom fields manager UI.

### Priority Next Steps (Pick What to Tackle Next):
1. **✅ P1 — RBAC Security & DB RLS Hardening (H2.1–H2.8): Done in code & SQL** — **only SQL execution remains:**
   - Apply `0011_placements_db_now.sql` and `0012_rbac_rls_hardening.sql` in Supabase SQL Editor (then smoke-test a restricted non-admin login to confirm `get_my_permissions()` + `has_permission()` RLS enforcement).
2. **🟠 P2 — Deployments, Reports Charts & Mobile App Integration:**
   - Deploy Edge Function `supabase/functions/send-push/index.ts`.
   - Build `/reports` charts (4 chart cards) & Commission calculation (`H8.1–H8.2`).
   - Mobile app (`mobile/src` + `docs/mobile-sync-todo.md`): wire `expo-notifications` token registration into `device_tokens` for CRM push delivery (`H1`, `H6.1`), build automated `daily-reminders` & WhatsApp OTP Edge Functions (`H1`), and sync CRM labels/screens.
3. **🟡 P3 — Final Lock & Polish:**
   - Lock `placements.slot_name` list (`H7.2`) **only after mobile app build finishes and final slot keys are confirmed**.
   - Populate `public.insurers.logo_url` links whenever brand assets are ready (CRM UI is already pre-wired).
   - Optional polish: Ad slot create UI (`H9`), Quote completed/closed tiles (`H9`), deduplicate `crm/supabase` vs root `supabase`.

### Strict Conventions:
- Follow `crm/design.md` §7: no `alert()`, no `window.confirm()`, no native `<select>` or `<input type="date">`, no `font-mono`, no foreign shadows, no hard-coded hex colours, no yellow buttons.
- Every page starts with `requirePermission(...)`; every server action uses `authorize(...)`.
- Verify changes inside `c:\Users\Mohit\Desktop\securedrive\crm` with `npm run typecheck` and `npm run build`.
- Git remote: `https://github.com/mohittarkardev-ops/crm.git` branch `main`.
```
