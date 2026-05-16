/**
 * 보호자 표시 라벨 유틸리티
 *
 * 학원 현장 관행: 학부모를 본명이 아니라 "OO 보호자"로 식별.
 * UI 노출 시 자녀 이름 기반 라벨이 메인, 본명은 부가 정보.
 *
 * 저장은 변하지 않음 — guardians.name은 본명 단일 출처.
 * 표시 라벨만 derive.
 */

const JOIN_SEP = '·'

/**
 * 보호자 표시 라벨 생성
 *
 * @param guardianName 보호자 본명 (guardians.name)
 * @param studentNames 연결된 자녀 이름 배열 (deleted 제외, 순서대로)
 * @returns 자녀 기반 라벨 또는 본명 fallback
 *
 * @example
 * getGuardianDisplayLabel('이영희', ['이종민', '이유빈'])
 * // => '이종민·이유빈 보호자'
 *
 * getGuardianDisplayLabel('이영희', ['이종민'])
 * // => '이종민 보호자'
 *
 * getGuardianDisplayLabel('이영희', [])
 * // => '이영희'
 *
 * getGuardianDisplayLabel(null, ['이종민'])
 * // => '이종민 보호자'
 */
export function getGuardianDisplayLabel(
  guardianName: string | null | undefined,
  studentNames: string[]
): string {
  const validStudents = studentNames.filter((s) => s && s.trim().length > 0)
  if (validStudents.length > 0) {
    return `${validStudents.join(JOIN_SEP)} 보호자`
  }
  return guardianName?.trim() || '이름 없음'
}

/**
 * 보호자 부가 표시 (본명) — 메인 라벨이 자녀 기반일 때 보조로 노출
 * 자녀 없거나 본명을 라벨로 이미 쓴 경우 null 반환
 */
export function getGuardianSecondaryLabel(
  guardianName: string | null | undefined,
  studentNames: string[]
): string | null {
  const hasStudents = studentNames.filter((s) => s && s.trim().length > 0).length > 0
  if (!hasStudents) return null
  const trimmed = guardianName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}
