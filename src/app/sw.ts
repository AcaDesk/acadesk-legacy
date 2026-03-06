import { defaultCache } from '@serwist/next/worker'
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  type PrecacheEntry,
  type SerwistGlobalConfig,
  Serwist,
} from 'serwist'

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
      matcher: /\/(attendance|kiosk)(\/|$)/,
      handler: new NetworkFirst({
        cacheName: 'pwa-pages',
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    // Supabase API — NetworkOnly (데이터는 IDB가 처리)
    {
      matcher: /supabase\.co/,
      handler: new NetworkOnly(),
    },
    // 정적 자산 — CacheFirst
    {
      matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/,
      handler: new CacheFirst({
        cacheName: 'static-assets',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
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
