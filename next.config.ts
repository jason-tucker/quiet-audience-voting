import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Hide the Next.js dev indicator/devtools overlay in the corner of the page.
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "dev.qcffpoll.com" },
      { protocol: "https", hostname: "qcffpoll.com" },
    ],
  },
  // Local uploads are served via a custom route handler at /uploads/[...path]
};

export default nextConfig;
