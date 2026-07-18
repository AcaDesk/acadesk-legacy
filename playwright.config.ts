import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright e2e 설정
 *
 * 실행: pnpm test:e2e (로컬 dev 서버를 자동 기동, 이미 떠 있으면 재사용)
 *
 * 스모크 시나리오는 실제 계정 로그인이 필요하므로 환경변수로 게이트된다:
 *   E2E_EMAIL / E2E_PASSWORD — 테스트 계정 (테스트 전용 테넌트 권장)
 *   PLAYWRIGHT_BASE_URL — 기본 http://localhost:3000
 * 미설정 시 해당 테스트는 skip 처리되어 실패하지 않는다.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
