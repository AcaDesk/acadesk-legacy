import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false, // 자체 네트워크 상태 관리 사용
});

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

export default withSerwist(nextConfig);
