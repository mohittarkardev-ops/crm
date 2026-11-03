import { ModulePage } from "@/components/modules/module-page";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/field";
import { getStaffList } from "@/lib/data/admin";
import { STAFF_ROLE_OPTIONS } from "@/lib/options";

export default async function SettingsPage() {
  const { rows } = await getStaffList();

  return (
    <div className="space-y-4">
      <Card index={0}>
        <CardHeader title="Business profile" />
        <form>
          <FieldGrid
            fields={[
              { name: "businessName", label: "Advisor or business name" },
              { name: "licence", label: "IRDAI licence number" },
              { name: "supportPhone", label: "Support phone", type: "tel" },
              { name: "supportWhatsapp", label: "Support WhatsApp number", type: "tel" },
              { name: "disclaimer", label: "Disclaimer shown in the app", type: "textarea", full: true },
            ]}
          />
          <div className="mt-5 flex justify-end">
            <Button type="submit" disabled title="Saving is added in the next step">
              Save
            </Button>
          </div>
        </form>
      </Card>

      <ModulePage
        index={1}
        title="Staff and roles"
        rows={rows}
        emptyLabel="No staff yet"
        search="Search name or email…"
        columns={[
          { key: "name", label: "Name", type: "person" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role", type: "chip" },
          { key: "joined", label: "Joined", type: "date" },
        ]}
        primary={{
          label: "Invite Staff",
          drawerTitle: "Invite Staff",
          fields: [
            { name: "name", label: "Full name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "role", label: "Role", type: "select", options: STAFF_ROLE_OPTIONS, required: true, full: true },
          ],
        }}
      />
    </div>
  );
}
