import { test, expect } from '@playwright/test'

/**
 * 핵심 화면 스모크 테스트 (읽기 전용)
 *
 * 로그인 → 대시보드/학생/출석/성적/상담 주요 화면이 에러 없이 렌더되는지 검증한다.
 * 데이터를 변경하지 않으므로 운영 테넌트 계정으로도 안전하지만,
 * 테스트 전용 테넌트 계정을 권장한다.
 *
 * 필요 환경변수: E2E_EMAIL, E2E_PASSWORD (미설정 시 전체 skip)
 */

const E2E_EMAIL = process.env.E2E_EMAIL
const E2E_PASSWORD = process.env.E2E_PASSWORD
const hasCredentials = Boolean(E2E_EMAIL && E2E_PASSWORD)

test.describe('핵심 화면 스모크', () => {
  test.skip(!hasCredentials, 'E2E_EMAIL/E2E_PASSWORD 미설정 — 스모크 테스트 skip')

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(E2E_EMAIL!)
    await page.getByLabel('비밀번호').fill(E2E_PASSWORD!)
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    // 로그인 성공 시 대시보드로 리다이렉트
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  })

  test('대시보드가 렌더된다', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    // 에러 바운더리 폴백이 아닌 실제 콘텐츠 확인
    await expect(page.getByText('페이지를 불러오지 못했습니다')).toHaveCount(0)
  })

  test('학생 목록이 렌더된다', async ({ page }) => {
    await page.goto('/students')
    await expect(page.getByText('전체 학생 목록')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('페이지를 불러오지 못했습니다')).toHaveCount(0)
  })

  test('출석 페이지가 렌더된다', async ({ page }) => {
    await page.goto('/attendance')
    // 출석 페이지는 자체 error.tsx가 있음
    await expect(page.getByText('출석 페이지 로딩 오류')).toHaveCount(0)
    await expect(page.getByText('페이지를 불러오지 못했습니다')).toHaveCount(0)
  })

  test('성적 페이지가 렌더된다', async ({ page }) => {
    await page.goto('/grades')
    await expect(page.getByText('페이지를 불러오지 못했습니다')).toHaveCount(0)
  })

  test('상담 페이지가 렌더된다', async ({ page }) => {
    await page.goto('/consultations')
    await expect(page.getByText('페이지를 불러오지 못했습니다')).toHaveCount(0)
  })
})
