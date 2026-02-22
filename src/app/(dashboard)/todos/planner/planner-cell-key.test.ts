import { describe, it, expect } from 'vitest'
import { getCellKey, parseCellKey } from './planner-cell-key'

/**
 * parseCellKey / getCellKey 회귀 테스트
 *
 * 배경: UUID v7 ID에 하이픈이 포함되어 있어
 * 기존 split('-') 방식이 UUID를 잘못 파싱하는 버그가 있었음.
 * lastIndexOf('-') 방식으로 수정 후 회귀 방지를 위한 테스트.
 */

// ============================================================================
// UUID v7 ID 파싱 (핵심 회귀 케이스)
// ============================================================================
describe('UUID v7 셀 키 파싱', () => {
  it('UUID v7 형식 ID를 올바르게 파싱한다', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const result = parseCellKey(getCellKey(uuid, 3))
    expect(result).toEqual({ studentId: uuid, dayOfWeek: 3 })
  })

  it('여러 하이픈이 포함된 UUID도 마지막 하이픈 기준으로 분리한다', () => {
    const uuid = '01923f4a-7b8c-7def-9012-abcdef345678'
    const result = parseCellKey(`${uuid}-5`)
    expect(result).toEqual({ studentId: uuid, dayOfWeek: 5 })
  })

  it('0~6 모든 요일에 대해 UUID가 보존된다', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    for (let day = 0; day <= 6; day++) {
      const key = getCellKey(uuid, day)
      const parsed = parseCellKey(key)
      expect(parsed).toEqual({ studentId: uuid, dayOfWeek: day })
    }
  })
})

// ============================================================================
// getCellKey ↔ parseCellKey 라운드트립
// ============================================================================
describe('getCellKey ↔ parseCellKey 라운드트립', () => {
  it('단순 ID도 라운드트립이 성공한다', () => {
    const result = parseCellKey(getCellKey('student-1', 2))
    expect(result).toEqual({ studentId: 'student-1', dayOfWeek: 2 })
  })

  it('하이픈 없는 단순 ID', () => {
    const result = parseCellKey(getCellKey('abc123', 0))
    expect(result).toEqual({ studentId: 'abc123', dayOfWeek: 0 })
  })

  it('숫자만 있는 ID', () => {
    const result = parseCellKey(getCellKey('12345', 6))
    expect(result).toEqual({ studentId: '12345', dayOfWeek: 6 })
  })
})

// ============================================================================
// 엣지 케이스
// ============================================================================
describe('parseCellKey 엣지 케이스', () => {
  it('하이픈 없는 문자열은 null 반환', () => {
    expect(parseCellKey('nohyphen')).toBeNull()
  })

  it('빈 문자열은 null 반환', () => {
    expect(parseCellKey('')).toBeNull()
  })

  it('마지막 부분이 숫자가 아니면 null 반환', () => {
    expect(parseCellKey('student-abc')).toBeNull()
  })

  it('하이픈만 있고 studentId가 빈 문자열이면 null 반환', () => {
    expect(parseCellKey('-3')).toBeNull()
  })

  it('두 자릿수 dayOfWeek도 파싱된다', () => {
    const result = parseCellKey('student-id-12')
    expect(result).toEqual({ studentId: 'student-id', dayOfWeek: 12 })
  })
})

// ============================================================================
// 기존 split('-') 방식과의 비교 (회귀 검증)
// ============================================================================
describe('기존 split 방식 vs lastIndexOf 방식 비교', () => {
  it('split 방식은 UUID를 잘못 파싱한다 (회귀 증명)', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const key = `${uuid}-3`

    // 기존 buggy 방식: split('-')
    const parts = key.split('-')
    const buggyStudentId = parts[0] // '550e8400' — 잘려나감!
    const buggyDayOfWeek = parseInt(parts[parts.length - 1], 10) // 3

    expect(buggyStudentId).toBe('550e8400') // UUID가 잘려나감!
    expect(buggyStudentId).not.toBe(uuid) // 원본 UUID와 다름

    // 수정된 방식: lastIndexOf('-')
    const fixed = parseCellKey(key)
    expect(fixed?.studentId).toBe(uuid) // UUID 보존됨
    expect(fixed?.dayOfWeek).toBe(3)
  })
})
