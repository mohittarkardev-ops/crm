import { Eye, EyeOff, LayoutTemplate, Send } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { sendNotification } from "@/lib/actions/engagement";
import { getNotifications } from "@/lib/data/engagement";
import { AUDIENCE_OPTIONS, NOTIFICATION_KIND_OPTIONS, READ_OPTIONS } from "@/lib/options";

export default async function NotificationsPage() {
  const { rows, stats } = await getNotifications();

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Sent" icon={Send} value={stats.sent} />
        <MiniStat index={1} title="Read Rate" icon={Eye} value={stats.readRate} kind="percent" />
        <MiniStat index={2} title="Unread" icon={EyeOff} value={stats.unread} />
        <MiniStat index={3} title="Templates" icon={LayoutTemplate} value={stats.templates} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        emptyLabel="No notifications yet"
        search="Search title or recipient…"
        filters={[
          { key: "kind", label: "All kinds", options: NOTIFICATION_KIND_OPTIONS },
          { key: "read", label: "Read and unread", options: READ_OPTIONS },
        ]}
        columns={[
          { key: "title", label: "Title" },
          { key: "recipient", label: "Recipient", type: "person" },
          { key: "kind", label: "Kind", type: "chip" },
          { key: "sentOn", label: "Sent", type: "date" },
          { key: "read", label: "Read", type: "chip" },
        ]}
        primary={{
          label: "New Notification",
          drawerTitle: "New Notification",
          action: sendNotification,
          fields: [
            { name: "title", label: "Title", required: true, full: true },
            { name: "body", label: "Message", type: "textarea", required: true, full: true },
            { name: "kind", label: "Kind", type: "select", options: NOTIFICATION_KIND_OPTIONS, required: true },
            { name: "audience", label: "Send to", type: "select", options: AUDIENCE_OPTIONS, required: true },
            {
              name: "target",
              label: "Mobile number",
              type: "tel",
              full: true,
              hint: "Only for “One user”. Broadcasts go to everyone who has logged in to the app.",
            },
            {
              name: "confirm",
              label: "I confirm this will be sent to every selected user (not needed for one user).",
              type: "checkbox",
              full: true,
            },
          ],
        }}
      />
    </div>
  );
}
