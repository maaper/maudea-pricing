import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for Docker deployment: generates a minimal standalone server bundle
  output: 'standalone',
  // Don't fail the build on TypeScript errors in production
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint config is valid but missing from some NextConfig type definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...({
    eslint: { ignoreDuringBuilds: true },
  } as any),
};

export default nextConfig;
