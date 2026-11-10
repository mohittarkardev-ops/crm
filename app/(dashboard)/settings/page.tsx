import { BusinessProfileForm } from "@/components/modules/business-profile-form";
import { Card, CardHeader } from "@/components/ui/card";
import { AgencySealCharacter } from "@/components/ui/characters";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";
import { getStaffList } from "@/lib/data/admin";
import { getBusinessProfile } from "@/lib/data/lookups";
import { getRoles } from "@/lib/data/rbac";
import { RbacSettingsShell } from "@/components/modules/rbac/rbac-settings-shell";

export default async function SettingsPage() {
  const staff = await requirePermission("settings.view");
  const canEditProfile = can(staff, "settings.edit");
  const canManageStaff = can(staff, "staff.manage");
  const isSuperAdmin = staff.role === "admin";
  const [staffList, roles, { profile, missing }] = await Promise.all([
    canManageStaff ? getStaffList(staff.id, isSuperAdmin) : Promise.resolve({ rows: [] }),
    canManageStaff ? getRoles() : Promise.resolve([]),
    getBusinessProfile(),
  ]);

  return (
    <div className="space-y-4">
      <Card index={0}>
        <CardHeader title="Business profile" />
        {missing && (
          <div className="mb-4 flex items-center gap-3 rounded-control bg-warning-soft px-3 py-2 text-xs text-warning">
            <AgencySealCharacter state="missing" className="h-10 w-12" />
            <span>
              The settings table does not exist yet. Run <b>supabase/migrations/0005_app_settings.sql</b> in the Supabase
              SQL Editor, then reload this page.
            </span>
          </div>
        )}
        <BusinessProfileForm profile={profile} readOnly={!canEditProfile} />
      </Card>

      {canManageStaff && (
        <RbacSettingsShell staffRows={staffList.rows} roles={roles} isSuperAdmin={isSuperAdmin} />
      )}
    </div>
  );
}
