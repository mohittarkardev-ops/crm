import { TriangleAlert } from "lucide-react";
import { BusinessProfileForm } from "@/components/modules/business-profile-form";
import { ModulePage } from "@/components/modules/module-page";
import { Card, CardHeader } from "@/components/ui/card";
import { addStaff, removeStaff, updateStaff } from "@/lib/actions/staff";
import { getStaff } from "@/lib/auth";
import { getStaffList } from "@/lib/data/admin";
import { getBusinessProfile } from "@/lib/data/lookups";
import { STAFF_ROLE_OPTIONS } from "@/lib/options";

export default async function SettingsPage() {
  const { staff } = await getStaff();
  const isAdmin = staff?.role === "admin";
  const [staffList, { profile, missing }] = await Promise.all([
    isAdmin && staff ? getStaffList(staff.id) : Promise.resolve({ rows: [] }),
    getBusinessProfile(),
  ]);

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

      {isAdmin ? (
        <ModulePage
          index={1}
          title="Staff and roles"
          rows={staffList.rows}
          emptyLabel="No staff yet"
          search="Search name or email…"
          columns={[
            { key: "name", label: "Name", type: "person" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role", type: "chip" },
            { key: "joined", label: "Joined", type: "date" },
          ]}
          primary={{
            label: "Add Staff",
            drawerTitle: "Add Staff",
            action: addStaff,
            fields: [
              { name: "name", label: "Full name", required: true },
              { name: "email", label: "Email (their login)", type: "email", required: true },
              {
                name: "role",
                label: "Role",
                type: "select",
                options: STAFF_ROLE_OPTIONS,
                required: true,
                hint: "Admins manage staff and settings. Fine-grained permissions come later.",
              },
              {
                name: "password",
                label: "Temporary password",
                type: "password",
                required: true,
                hint: "At least 8 characters. Share it with them; they can sign in right away.",
              },
            ],
          }}
          edit={{
            drawerTitle: "Edit Staff",
            action: updateStaff,
            fields: [
              { name: "name", label: "Full name", required: true },
              { name: "role", label: "Role", type: "select", options: STAFF_ROLE_OPTIONS, required: true },
              {
                name: "newPassword",
                label: "New password (optional)",
                type: "password",
                full: true,
                hint: "Leave empty to keep the current password.",
              },
            ],
          }}
          rowActions={[
            {
              label: "Remove",
              action: removeStaff,
              danger: true,
              showWhen: { key: "isSelf", in: ["no"] },
              confirm: "Remove this person? Their login stops working immediately.",
            },
          ]}
        />
      ) : (
        <Card index={1}>
          <CardHeader title="Staff and roles" />
          <p className="text-sm text-ink-muted">Only admins can add or manage staff accounts.</p>
        </Card>
      )}
    </div>
  );
}
