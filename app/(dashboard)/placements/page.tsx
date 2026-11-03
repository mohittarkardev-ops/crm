import { CalendarClock, CalendarX2, Megaphone, ToggleRight } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getPlacements } from "@/lib/data/engagement";
import { PLACEMENT_STATUS_OPTIONS } from "@/lib/options";

export default async function PlacementsPage() {
  const { rows, stats, slotOptions } = await getPlacements();

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
        emptyLabel="No placements yet"
        search="Search title…"
        filters={[
          { key: "slot", label: "All slots", options: slotOptions },
          { key: "status", label: "All statuses", options: PLACEMENT_STATUS_OPTIONS },
        ]}
        columns={[
          { key: "slot", label: "Slot", type: "chip" },
          { key: "title", label: "Title" },
          { key: "startsOn", label: "Starts", type: "date" },
          { key: "endsOn", label: "Ends", type: "date" },
          { key: "status", label: "Status", type: "chip" },
        ]}
        primary={{
          label: "New Placement",
          drawerTitle: "New Placement",
          fields: [
            { name: "slot", label: "Slot name", required: true },
            { name: "title", label: "Title", required: true },
            { name: "body", label: "Message", type: "textarea", full: true },
            { name: "ctaLabel", label: "Button label" },
            { name: "actionUrl", label: "Button link" },
            { name: "startsOn", label: "Starts on", type: "date" },
            { name: "endsOn", label: "Ends on", type: "date" },
          ],
        }}
      />
    </div>
  );
}
