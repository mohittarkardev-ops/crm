import { Eye, EyeOff, LayoutTemplate, Send } from "lucide-react";
import { NotificationsShell } from "@/components/modules/notifications-shell";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { getNotifications } from "@/lib/data/engagement";
import { can } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/server";

export default async function NotificationsPage() {
  const staff = await requirePermission("notifications.view");
  const { rows, totalCount, templateRows, templateOptions, deviceTokenCount, stats } = await getNotifications();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Sent" icon={Send} value={stats.sent} />
        <MiniStat index={1} title="Read Rate" icon={Eye} value={stats.readRate} kind="percent" />
        <MiniStat index={2} title="Unread" icon={EyeOff} value={stats.unread} />
        <MiniStat index={3} title="Templates" icon={LayoutTemplate} value={stats.templates} />
      </StatRow>

      <NotificationsShell
        rows={rows}
        totalCount={totalCount}
        templateRows={templateRows}
        templateOptions={templateOptions}
        deviceTokenCount={deviceTokenCount}
        canSend={can(staff, "notifications.send")}
      />
    </div>
  );
}
