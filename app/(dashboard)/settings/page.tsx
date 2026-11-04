import { TriangleAlert } from "lucide-react";
import { BusinessProfileForm } from "@/components/modules/business-profile-form";
import { ModulePage } from "@/components/modules/module-page";
import { Card, CardHeader } from "@/components/ui/card";
import { getStaffList } from "@/lib/data/admin";
import { getBusinessProfile } from "@/lib/data/lookups";

export default async function SettingsPage() {
  const [{ rows }, { profile, missing }] = await Promise.all([getStaffList(), getBusinessProfile()]);

  return (
    <div className="space-y-4">
      <Card index={0}>
        <CardHeader title="Business profile" />
        {missing && (
          <p className="mb-4 flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
            <TriangleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              The settings table does not exist yet. Run <b>supabase/migrations/0005_app_settings.sql</b> in the Supabase
              SQL Editor, then reload this page.
            </span>
          </p>
        )}
        <BusinessProfileForm profile={profile} />
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
      />
    </div>
  );
}
