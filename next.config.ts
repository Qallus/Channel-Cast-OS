import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: "/admin", destination: "/app/admin", permanent: false },
      { source: "/dashboard", destination: "/app/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
