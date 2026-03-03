import { defaultCache } from '@serwist/next/worker'
import { type PrecacheEntry, type SerwistGlobalConfig, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 출석/키오스크 페이지 — NetworkFirst (5초 타임아웃)
    {
      urlPattern: /\/(attendance|kiosk)(\/|$)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pwa-pages',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60, // 1일
        },
      },
    },
    // Supabase API — NetworkOnly (데이터는 IDB가 처리)
    {
      urlPattern: /supabase\.co/,
      handler: 'NetworkOnly',
    },
    // 정적 자산 — CacheFirst
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        },
      },
    },
    // Next.js 기본 캐시 전략
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

serwist.addEventListeners()
