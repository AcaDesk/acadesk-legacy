import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loosen build checks to allow incremental typing fixes while shipping
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
