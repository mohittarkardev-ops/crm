import { CalendarClock, CalendarX2, Megaphone, ToggleRight } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import {
  activatePlacement,
  createPlacement,
  deactivatePlacement,
  deletePlacement,
  updatePlacement,
} from "@/lib/actions/engagement";
import { getPlacements } from "@/lib/data/engagement";
import type { FieldDef } from "@/lib/module-types";
import { PLACEMENT_STATUS_OPTIONS } from "@/lib/options";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function PlacementsPage() {
  const staff = await requirePermission("placements.view");
  const canManage = can(staff, "placements.manage");
  const { rows, totalCount, stats, slotOptions } = await getPlacements();

  // The same fields are used to create and to edit. When editing, each field is pre-filled from the row key of the same name.
  const fields: FieldDef[] = [
    {
      name: "slot",
      label: "Slot name",
      required: true,
      suggestions: slotOptions.map((s) => s.value),
      hint: "Flexible until final mobile build; e.g. home_banner.",
    },
    { name: "title", label: "Title", required: true },
    { name: "body", label: "Message", type: "textarea", full: true },
    {
      name: "imageUrl",
      label: "Image URL",
      full: true,
      hint: "Optional https:// image URL shown on banner placements.",
    },
    { name: "ctaLabel", label: "Button label" },
    { name: "actionUrl", label: "Button link", hint: "Starts with https:// or /" },
    { name: "startsOn", label: "Starts on", type: "date", hint: "Leave empty to start now." },
    { name: "endsOn", label: "Ends on", type: "date", hint: "Leave empty to run until switched off." },
    { name: "sortOrder", label: "Sort order", type: "number", hint: "Lower numbers show first (default 0)." },
  ];

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Live" icon={Megaphone} value={stats.live} />
        <MiniStat index={1} title="Scheduled" icon={CalendarClock} value={stats.scheduled} />
        <MiniStat index={2} title="Switched Off" icon={ToggleRight} value={stats.off} />
        <MiniStat index={3} title="Ended" icon={CalendarX2} value={stats.ended} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        totalCount={totalCount}
        exportName="placements"
        emptyLabel="No placements yet"
        search="Search title…"
        filters={[
          { key: "slot", label: "All slots", options: slotOptions },
          { key: "status", label: "All statuses", options: PLACEMENT_STATUS_OPTIONS },
        ]}
        columns={[
          { key: "slot", label: "Slot", type: "chip" },
          { key: "imageUrl", label: "Banner", type: "image" },
          { key: "title", label: "Title" },
          { key: "sortOrder", label: "Order", type: "number", align: "right" },
          { key: "startsOn", label: "Starts", type: "date" },
          { key: "endsOn", label: "Ends", type: "date" },
          { key: "status", label: "Status", type: "chip" },
        ]}
        edit={canManage ? { drawerTitle: "Edit Placement", fields, action: updatePlacement } : undefined}
        rowActions={
          canManage
            ? [
                {
                  label: "Turn off",
                  action: deactivatePlacement,
                  showWhen: { key: "status", in: ["live", "scheduled"] },
                },
                { label: "Turn on", action: activatePlacement, showWhen: { key: "status", in: ["off"] } },
                {
                  label: "Delete",
                  action: deletePlacement,
                  danger: true,
                  confirm: "Delete this placement? The app stops showing it immediately.",
                },
              ]
            : undefined
        }
        primary={
          canManage
            ? {
                label: "New Placement",
                drawerTitle: "New Placement",
                action: createPlacement,
                fields,
                defaultValues: { sortOrder: "0" },
              }
            : undefined
        }
      />
    </div>
  );
}
