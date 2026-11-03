
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
      allowedOrigins: [
        "g2fpkpqk-3000.inc1.devtunnels.ms",
      ],
    },
  },

  allowedDevOrigins: [
    "g2fpkpqk-3000.inc1.devtunnels.ms",
    "172.25.126.3",
  ],
};

export default nextConfig;
