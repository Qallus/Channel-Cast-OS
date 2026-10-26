import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: __dirname,
  eslint: { ignoreDuringBuilds: true },
  // OAuth discovery for the MCP connector (see app/api/oauth/metadata/*).
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata/resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/metadata/resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata/server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/metadata/server" },
      { source: "/.well-known/openid-configuration", destination: "/api/oauth/metadata/server" },
    ];
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/app/admin", permanent: false },
      { source: "/dashboard", destination: "/app/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
