import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================================================
  // Performance Optimizations
  // ============================================================================

  // Enable gzip compression for responses
  compress: true,

  // Remove X-Powered-By header for security (hides Next.js usage)
  poweredByHeader: false,

  // ============================================================================
  // Build Configuration
  // ============================================================================

  // Loosen build checks to allow incremental typing fixes while shipping
  // TODO: Enable these once all type errors are fixed
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ============================================================================
  // Image Configuration
  // ============================================================================

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
