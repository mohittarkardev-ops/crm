import { User, UserPlus, UserRoundCheck, Users } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { addClient } from "@/lib/actions/clients";
import { getClients } from "@/lib/data/clients";
import { CLIENT_TYPE_OPTIONS } from "@/lib/options";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function ClientsPage() {
  const staff = await requirePermission("clients.view");
  const { rows, stats } = await getClients();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Total Users" icon={Users} value={stats.total} />
        <MiniStat index={1} title="Advisor Clients" icon={UserRoundCheck} value={stats.advisors} />
        <MiniStat index={2} title="General Users" icon={User} value={stats.general} />
        <MiniStat index={3} title="New This Month" icon={UserPlus} value={stats.fresh} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        emptyLabel="No clients yet"
        search="Search name or mobile…"
        filters={[{ key: "type", label: "All types", options: CLIENT_TYPE_OPTIONS }]}
        columns={[
          { key: "name", label: "Name", type: "person" },
          { key: "mobile", label: "Mobile" },
          { key: "email", label: "Email" },
          { key: "type", label: "Type", type: "chip" },
          { key: "policies", label: "Policies", type: "number" },
          { key: "joined", label: "Joined", type: "date" },
        ]}
        primary={!can(staff, "clients.create") ? undefined : {
          label: "Add Client",
          drawerTitle: "Add Client",
          action: addClient,
          fields: [
            { name: "name", label: "Full name", required: true },
            {
              name: "mobile",
              label: "Mobile number",
              type: "tel",
              required: true,
              hint: "10 digits. They are linked automatically when they log in to the app.",
            },
            { name: "email", label: "Email", type: "email" },
            { name: "type", label: "Client type", type: "select", options: CLIENT_TYPE_OPTIONS, required: true },
            { name: "dob", label: "Date of birth", type: "date", maxToday: true },
          ],
        }}
      />
    </div>
  );
}
