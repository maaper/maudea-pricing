import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for Docker deployment: generates a minimal standalone server bundle
  output: 'standalone',
};

export default nextConfig;
