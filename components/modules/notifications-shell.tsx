"use client";

import { useState } from "react";
import { ModulePage } from "@/components/modules/module-page";
import { Segmented } from "@/components/ui/segmented";
import {
  createTemplate,
  deleteNotification,
  deleteTemplate,
  previewNotification,
  sendNotification,
  updateTemplate,
} from "@/lib/actions/notifications";
import type { FieldDef, Option, Row } from "@/lib/module-types";
import {
  AUDIENCE_OPTIONS,
  CATEGORY_OPTIONS,
  NOTIFICATION_KIND_OPTIONS,
  READ_OPTIONS,
  TEMPLATE_TYPE_OPTIONS,
} from "@/lib/options";

type NotificationsShellProps = {
  rows: Row[];
  totalCount: number;
  templateRows: Row[];
  templateOptions: Option[];
  deviceTokenCount: number;
  canSend: boolean;
};

export function NotificationsShell({
  rows,
  totalCount,
  templateRows,
  templateOptions,
  deviceTokenCount,
  canSend,
}: NotificationsShellProps) {
  const [tab, setTab] = useState<"sent" | "templates">("sent");

  const templateFields: FieldDef[] = [
    { name: "name", label: "Template name", required: true, hint: "Internal name, e.g. 30-Day Renewal Reminder." },
    { name: "type", label: "Type", type: "select", options: TEMPLATE_TYPE_OPTIONS, required: true },
    { name: "title", label: "Notification title", required: true, full: true },
    { name: "body", label: "Message", type: "textarea", required: true, full: true },
  ];

  const sendFields: FieldDef[] = [
    ...(templateOptions.length > 1
      ? [
          {
            name: "templateId",
            label: "Use template (optional)",
            type: "select" as const,
            options: templateOptions,
            full: true,
            hint: "If selected, you can leave Title and Message blank to send the template text as-is.",
          },
        ]
      : []),
    { name: "title", label: "Title", full: true },
    { name: "body", label: "Message", type: "textarea", full: true },
    { name: "kind", label: "Kind", type: "select", options: NOTIFICATION_KIND_OPTIONS, required: true },
    { name: "audience", label: "Send to", type: "select", options: AUDIENCE_OPTIONS, required: true },
    {
      name: "target",
      label: "Mobile number",
      type: "tel",
      full: true,
      showWhen: { field: "audience", equals: ["user"] },
    },
    {
      name: "expiryFrom",
      label: "Expiring from",
      type: "date",
      required: true,
      showWhen: { field: "audience", equals: ["expiring"] },
      hint: "Use the same date in both boxes for one exact day.",
    },
    {
      name: "expiryTo",
      label: "Expiring until",
      type: "date",
      required: true,
      showWhen: { field: "audience", equals: ["expiring"] },
    },
    {
      name: "category",
      label: "Category (optional)",
      type: "select",
      options: [{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS],
      full: true,
      showWhen: { field: "audience", equals: ["expiring"] },
      hint: "Policies already renewed are skipped. Clients who have not logged in to the app cannot see it.",
    },
    {
      name: "confirm",
      label: "I confirm this will be sent to every selected user (not needed for one user).",
      type: "checkbox",
      full: true,
      showWhen: { field: "audience", equals: ["everyone", "advisor_clients", "general_users", "expiring"] },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Notifications sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "sent" as const, label: `Sent History (${totalCount.toLocaleString("en-IN")})` },
            { value: "templates" as const, label: `Templates (${templateRows.length.toLocaleString("en-IN")})` },
          ]}
        />
        <p className="text-xs text-ink-muted">
          {deviceTokenCount === 0
            ? "No mobile device push tokens registered yet — alerts write to Updates feed and will push once mobile tokens are registered."
            : `${deviceTokenCount.toLocaleString("en-IN")} device token${deviceTokenCount === 1 ? "" : "s"} registered for push alerts.`}
        </p>
      </div>

      {tab === "sent" ? (
        <ModulePage
          index={4}
          rows={rows}
          totalCount={totalCount}
          exportName="notifications"
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
          rowActions={
            canSend
              ? [
                  {
                    label: "Delete",
                    action: deleteNotification,
                    danger: true,
                    confirm: "Remove this notification from the recipient's feed?",
                  },
                ]
              : undefined
          }
          primary={
            canSend
              ? {
                  label: "New Notification",
                  drawerTitle: "New Notification",
                  action: sendNotification,
                  preview: previewNotification,
                  fields: sendFields,
                }
              : undefined
          }
        />
      ) : (
        <ModulePage
          index={4}
          rows={templateRows}
          exportName="notification-templates"
          emptyLabel="No notification templates yet"
          search="Search template name or title…"
          filters={[{ key: "type", label: "All types", options: TEMPLATE_TYPE_OPTIONS }]}
          columns={[
            { key: "name", label: "Name" },
            { key: "title", label: "Title" },
            { key: "body", label: "Message" },
            { key: "type", label: "Type", type: "chip" },
            { key: "createdOn", label: "Created", type: "date" },
          ]}
          edit={
            canSend
              ? {
                  drawerTitle: "Edit Template",
                  fields: templateFields,
                  action: updateTemplate,
                }
              : undefined
          }
          rowActions={
            canSend
              ? [
                  {
                    label: "Delete",
                    action: deleteTemplate,
                    danger: true,
                    confirm: "Delete this template?",
                  },
                ]
              : undefined
          }
          primary={
            canSend
              ? {
                  label: "New Template",
                  drawerTitle: "New Template",
                  action: createTemplate,
                  fields: templateFields,
                  defaultValues: { type: "broadcast" },
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
