import { Ban, Layers, ToggleRight } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getAdControls } from "@/lib/data/admin";

export default async function AdControlsPage() {
  const { slotRows, freeRows, stats } = await getAdControls();

  return (
    <div className="space-y-4">
      <StatRow columns={3}>
        <MiniStat index={0} title="Slots On" icon={ToggleRight} value={stats.on} />
        <MiniStat index={1} title="Slots Off" icon={Layers} value={stats.off} />
        <MiniStat index={2} title="Ad-free Users" icon={Ban} value={stats.adFree} />
      </StatRow>

      <ModulePage
        index={3}
        title="Ad slots"
        rows={slotRows}
        emptyLabel="No ad slots yet"
        columns={[
          { key: "slot", label: "Slot" },
          { key: "status", label: "Status", type: "chip" },
          { key: "updatedOn", label: "Last changed", type: "date" },
        ]}
      />

      <ModulePage
        index={4}
        title="Ad-free users"
        rows={freeRows}
        emptyLabel="No ad-free users yet"
        search="Search name or mobile…"
        columns={[
          { key: "name", label: "User", type: "person" },
          { key: "mobile", label: "Mobile" },
          { key: "addedOn", label: "Added", type: "date" },
        ]}
        primary={{
          label: "Add User",
          drawerTitle: "Add Ad-free User",
          fields: [{ name: "mobile", label: "Mobile number", type: "tel", required: true, full: true }],
        }}
      />
    </div>
  );
}
