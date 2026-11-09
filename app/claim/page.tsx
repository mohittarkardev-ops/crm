import type { Metadata } from "next";
import { ShieldCheck, Lock } from "lucide-react";
import { ClaimPortal } from "@/components/claim/claim-portal";
import { Chip } from "@/components/ui/chip";

export const metadata: Metadata = {
  title: "Agent Claim Portal — SecureDrive",
  description: "Submit a claim for a vehicle renewal payment.",
};

/**
 * Public claim form for agents (S6b). No CRM login required.
 * Access is gated by a shared code set in the CLAIM_PORTAL_CODE environment variable.
 */
export default function ClaimPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Header Bar */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-[1.5px] border-rule pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-control bg-ink text-white shrink-0 shadow-sm">
              <ShieldCheck size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold tracking-tight text-ink">SecureDrive</h1>
                <Chip tone="accent">Agent Portal</Chip>
              </div>
              <p className="text-xs text-ink-muted">Vehicle policy renewal claim submission</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface/60 rounded-control px-3 py-1.5 border border-divider self-start sm:self-auto">
            <Lock size={13} className="text-positive" />
            <span>Encrypted Agent Channel</span>
          </div>
        </div>

        {/* Interactive Claim Portal */}
        <ClaimPortal />

        {/* Footer Note */}
        <footer className="mt-10 border-t border-divider pt-6 text-center text-xs text-ink-faint space-y-1">
          <p>This portal is intended solely for authorised SecureDrive agents and partners.</p>
          <p>Submitted claims are logged, timestamped, and verified by operations prior to disbursement.</p>
        </footer>
      </div>
    </div>
  );
}
