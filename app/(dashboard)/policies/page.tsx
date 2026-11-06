import { CalendarClock, FileCheck2, FileText, FileX2 } from "lucide-react";
import { ModulePage } from "@/components/modules/module-page";
import { MiniStat, StatRow } from "@/components/ui/mini-stat";
import { addPolicy } from "@/lib/actions/policies";
import { getInsurerNames } from "@/lib/data/lookups";
import { getPolicies } from "@/lib/data/policies";
import {
  CATEGORY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  POLICY_STATUS_OPTIONS,
  SOURCE_OPTIONS,
  VERIFICATION_OPTIONS,
} from "@/lib/options";

export default async function PoliciesPage() {
  const [{ rows, stats }, insurers] = await Promise.all([getPolicies(), getInsurerNames()]);

  return (
    <div className="space-y-4">
      <StatRow>
        <MiniStat index={0} title="Total Policies" icon={FileText} value={stats.total} />
        <MiniStat index={1} title="Active" icon={FileCheck2} value={stats.active} />
        <MiniStat index={2} title="Expiring Soon" icon={CalendarClock} value={stats.expiring} />
        <MiniStat index={3} title="Expired" icon={FileX2} value={stats.expired} />
      </StatRow>

      <ModulePage
        index={4}
        rows={rows}
        emptyLabel="No policies yet"
        rowHref="/policies"
        dateFilter={{ key: "expiry", label: "Expiry" }}
        search="Search policy number or client…"
        filters={[
          { key: "category", label: "All categories", options: CATEGORY_OPTIONS },
          { key: "status", label: "All statuses", options: POLICY_STATUS_OPTIONS },
          { key: "source", label: "All sources", options: SOURCE_OPTIONS },
          { key: "verification", label: "All verification", options: VERIFICATION_OPTIONS },
        ]}
        columns={[
          { key: "policyNumber", label: "Policy no." },
          { key: "client", label: "Client", type: "person" },
          { key: "category", label: "Category", type: "chip" },
          { key: "insurer", label: "Insurer" },
          { key: "premium", label: "Premium", type: "inr", align: "right" },
          { key: "expiry", label: "Expiry", type: "date" },
          { key: "status", label: "Status", type: "chip" },
          { key: "source", label: "Source", type: "chip" },
        ]}
        primary={{
          label: "Add Policy",
          drawerTitle: "Add Policy",
          action: addPolicy,
          fields: [
            {
              name: "clientMobile",
              label: "Client mobile number",
              type: "tel",
              required: true,
              hint: "An existing client is found by this number. A new number creates a client.",
            },
            { name: "clientName", label: "Client name", hint: "Needed only when the number is new." },
            { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS, required: true },
            { name: "insurer", label: "Insurer", required: true, suggestions: insurers },
            { name: "policyNumber", label: "Policy number", required: true },
            { name: "premium", label: "Premium (₹)", type: "number" },
            { name: "startDate", label: "Start date", type: "date" },
            { name: "endDate", label: "End date", type: "date", required: true },
            { name: "planType", label: "Plan type" },
            { name: "holderName", label: "Policy holder name" },
            { name: "vehicleRegNo", label: "Vehicle registration no.", hint: "Car and two wheeler only." },
            { name: "vehicleMake", label: "Vehicle make" },
            { name: "vehicleModel", label: "Vehicle model", full: true },
            {
              name: "document",
              label: "Policy document",
              type: "file",
              accept: ".pdf,.jpg,.jpeg,.png,.webp",
              hint: "PDF, JPG, PNG or WebP, up to 4 MB. Optional.",
            },
            { name: "documentType", label: "Document type", type: "select", options: DOCUMENT_TYPE_OPTIONS },
          ],
        }}
      />
    </div>
  );
}
