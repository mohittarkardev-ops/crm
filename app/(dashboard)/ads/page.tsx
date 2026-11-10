import { Ban, Layers, ToggleRight } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { addAdFreeUser, disableAdSlot, enableAdSlot, removeAdFreeUser } from "@/lib/actions/ads";
import { getAdControls } from "@/lib/data/admin";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function AdControlsPage() {
  const staff = await requirePermission("ads.view");
  const canManage = can(staff, "ads.manage");
  const { slotRows, freeRows, totalAdFree, stats } = await getAdControls();

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
        rowActions={
          canManage
            ? [
                { label: "Turn off", action: disableAdSlot, showWhen: { key: "status", in: ["on"] } },
                { label: "Turn on", action: enableAdSlot, showWhen: { key: "status", in: ["off"] } },
              ]
            : undefined
        }
      />

      <ModulePage
        index={4}
        title="Ad-free users"
        rows={freeRows}
        totalCount={totalAdFree}
        exportName="ad-free-users"
        emptyLabel="No ad-free users yet"
        search="Search name or mobile…"
        columns={[
          { key: "name", label: "User", type: "person" },
          { key: "mobile", label: "Mobile" },
          { key: "addedOn", label: "Added", type: "date" },
        ]}
        rowActions={
          canManage
            ? [
                {
                  label: "Remove",
                  action: removeAdFreeUser,
                  danger: true,
                  confirm: "This user will see ads again. Continue?",
                },
              ]
            : undefined
        }
        primary={
          canManage
            ? {
                label: "Add User",
                drawerTitle: "Add Ad-free User",
                action: addAdFreeUser,
                fields: [
                  {
                    name: "mobile",
                    label: "Mobile number",
                    type: "tel",
                    required: true,
                    full: true,
                    hint: "The person must already be in Clients.",
                  },
                ],
              }
            : undefined
        }
      />
    </div>
  );
}
