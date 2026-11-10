import { NotFoundView } from "@/components/ui/not-found-view";

/** Top-level 404 outside the CRM dashboard shell (e.g. mistyped public routes). */
export default function GlobalNotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-2xl">
        <NotFoundView
          primaryHref="/"
          primaryLabel="Open SecureDrive CRM"
          quickLinks={[
            { href: "/claim", label: "Agent Claim Portal" },
            { href: "/login", label: "Staff Sign In" },
          ]}
          canSearch={false}
        />
      </div>
    </main>
  );
}
