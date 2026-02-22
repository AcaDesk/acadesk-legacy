import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * dashboard.ts 출석 테이블 참조 회귀 테스트
 *
 * 배경: dashboard.ts에서 .from('attendance_records')를 사용했으나
 * 실제 테이블명은 'attendance'. 모든 참조를 수정한 후 재발 방지를 위한 테스트.
 */

// ============================================================================
// 테이블 참조 검증
// ============================================================================
describe('dashboard.ts 출석 테이블 참조', () => {
  const filePath = resolve(__dirname, 'dashboard.ts')
  const fileContent = readFileSync(filePath, 'utf-8')

  it('attendance_records 테이블을 참조하지 않는다 (올바른 테이블명: attendance)', () => {
    const wrongReferences = fileContent.match(/from\(['"]attendance_records['"]\)/g)
    expect(wrongReferences).toBeNull()
  })

  it('attendance 테이블을 참조한다', () => {
    const correctReferences = fileContent.match(/from\(['"]attendance['"]\)/g)
    expect(correctReferences).not.toBeNull()
    expect(correctReferences!.length).toBeGreaterThanOrEqual(1)
  })
})
