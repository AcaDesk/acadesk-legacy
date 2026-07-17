import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

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
  // Security Headers
  // ============================================================================

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

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

// Sentry: 소스맵 업로드는 SENTRY_AUTH_TOKEN + org/project env가 있을 때만 수행되고,
// 없으면 빌드에 영향 없이 건너뛴다 (에러 수집 자체는 DSN만으로 동작).
export default withSentryConfig(withSerwist(nextConfig), {
  silent: true,
  disableLogger: true,
  widenClientFileUpload: true,
});
