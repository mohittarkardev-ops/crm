import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/incentives/*": ["./data/india-pincodes.tsv"],
  },
  experimental: {
    // Document uploads go through Server Actions. Vercel itself rejects bodies over 4.5 MB, so uploads are capped at 4 MB
    // (see lib/upload-limits.ts); this leaves headroom for the form fields.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
