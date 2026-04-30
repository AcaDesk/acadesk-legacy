/**
 * Kakao Alimtalk variable helpers.
 *
 * Solapi expects template variables to be keyed as "#{변수명}".
 * Internal callers may pass either "변수명", "{변수명}", "#{변수명}",
 * or legacy English aliases from older UI code.
 */

const KAKAO_VARIABLE_ALIASES: Record<string, string> = {
  studentName: '학생명',
  studentCode: '학생번호',
  grade: '학년',
  academyName: '학원명',
  academyPhone: '학원연락처',
  guardianName: '보호자명',
  period: '기간',
  attendanceRate: '출석률',
  homeworkRate: '숙제완료율',
  summaryComment: '종합평가',
  date: '날짜',
  time: '시간',
}

export function extractKakaoVariableNames(content: string): string[] {
  const matches = content.match(/#{([^}]+)}/g) || []
  return [...new Set(matches.map((match) => match.slice(2, -1).trim()).filter(Boolean))]
}

export function normalizeKakaoVariableName(key: string): string {
  const trimmed = key.trim()
  const withoutHash = trimmed.startsWith('#{') && trimmed.endsWith('}')
    ? trimmed.slice(2, -1)
    : trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed.slice(1, -1)
      : trimmed

  return KAKAO_VARIABLE_ALIASES[withoutHash] ?? withoutHash
}

export function formatKakaoVariableKey(name: string): string {
  return `#{${normalizeKakaoVariableName(name)}}`
}

export function normalizeKakaoVariables(
  variables?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  if (!variables) return {}

  return Object.entries(variables).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc
    acc[formatKakaoVariableKey(key)] = String(value)
    return acc
  }, {})
}

export function renderKakaoTemplatePreview(
  template: string,
  variables?: Record<string, string | number | boolean | null | undefined>
): string {
  const normalized = normalizeKakaoVariables(variables)

  return template.replace(/#{([^}]+)}/g, (match, variableName: string) => {
    const key = formatKakaoVariableKey(variableName)
    return normalized[key] ?? match
  })
}
