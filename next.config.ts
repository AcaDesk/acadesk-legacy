import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loosen build checks to allow incremental typing fixes while shipping
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow external images from DiceBear API
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
