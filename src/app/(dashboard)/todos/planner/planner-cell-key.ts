/**
 * 플래너 셀 키 유틸리티
 *
 * studentId와 dayOfWeek를 하나의 문자열 키로 결합/분리하는 헬퍼.
 * UUID v7 ID에 하이픈이 포함되어 있으므로 lastIndexOf('-') 방식을 사용.
 */

export function getCellKey(studentId: string, dayOfWeek: number): string {
  return `${studentId}-${dayOfWeek}`
}

export function parseCellKey(key: string): { studentId: string; dayOfWeek: number } | null {
  const lastHyphen = key.lastIndexOf('-')
  if (lastHyphen === -1) return null
  const studentId = key.substring(0, lastHyphen)
  const dayOfWeek = parseInt(key.substring(lastHyphen + 1), 10)
  if (studentId && !isNaN(dayOfWeek)) {
    return { studentId, dayOfWeek }
  }
  return null
}
