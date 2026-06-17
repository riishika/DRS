import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  serverActions: {
    bodySizeLimit: "50mb"
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp"]
  }
};

export default nextConfig;
