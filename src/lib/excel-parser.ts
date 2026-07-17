/**
 * Excel Parser Utility
 * exceljs를 사용한 엑셀 파일 파싱 유틸리티
 */

// exceljs는 무거운 라이브러리라 정적 import 시 이 모듈을 참조하는 페이지 번들이
// 통째로 팽창한다. 타입만 정적으로 쓰고 실제 로드는 사용 시점에 한다.
import type { Workbook, CellValue } from 'exceljs'
import type {
  StudentImportData,
  GuardianImportData,
} from '@/core/types/student-import'
import { StudentImportItem } from '@/core/types/student-import'

/**
 * 필수 헤더 목록
 */
const REQUIRED_HEADERS = ['학생 이름*', '생년월일(YYYY-MM-DD)*', '보호자1 이름*'] as const

/**
 * 모든 예상 헤더 목록 (순서대로)
 */
const EXPECTED_HEADERS = [
  '학생 이름*',
  '생년월일(YYYY-MM-DD)*',
  '학년',
  '학교',
  '학생 연락처',
  '학생 이메일',
  '메모',
  '보호자1 이름*',
  '보호자1 연락처',
  '보호자1 이메일',
  '보호자1 관계',
  '보호자1 직업',
  '보호자1 주소',
  '보호자2 이름',
  '보호자2 연락처',
  '보호자2 이메일',
  '보호자2 관계',
  '보호자2 직업',
  '보호자2 주소',
] as const

/**
 * 엑셀 파일에서 원시 데이터 읽기
 */
interface RawExcelRow {
  '학생 이름'?: string
  '생년월일(YYYY-MM-DD)'?: string
  '학년'?: string
  '학교'?: string
  '학생 연락처'?: string
  '학생 이메일'?: string
  '메모'?: string
  '보호자1 이름'?: string
  '보호자1 연락처'?: string
  '보호자1 이메일'?: string
  '보호자1 관계'?: string
  '보호자1 직업'?: string
  '보호자1 주소'?: string
  '보호자2 이름'?: string
  '보호자2 연락처'?: string
  '보호자2 이메일'?: string
  '보호자2 관계'?: string
  '보호자2 직업'?: string
  '보호자2 주소'?: string
}

/**
 * ExcelJS CellValue를 문자열로 변환
 */
function cellValueToString(value: CellValue): string {
  if (value == null) return ''
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'object') {
    if ('richText' in value) {
      return (value.richText as Array<{ text: string }>).map((rt) => rt.text).join('')
    }
    if ('result' in value) {
      return String((value as { result: unknown }).result ?? '')
    }
    return ''
  }
  return String(value)
}

/**
 * Excel 날짜 시리얼 넘버를 날짜 객체로 변환
 * (XLSX.SSF.parse_date_code 대체)
 * Excel epoch: 1900-01-01 = day 1, day 60 = Feb 29 1900 (leap year bug 보정)
 */
function parseExcelDateCode(serial: number): { y: number; m: number; d: number } | null {
  if (serial < 1) return null
  let dayCount = Math.floor(serial)
  // Excel의 1900 윤년 버그 보정: day 60 이후는 1일 빼기
  if (dayCount > 60) dayCount--
  const date = new Date(1899, 11, 31) // 1899-12-31
  date.setDate(date.getDate() + dayCount)
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  }
}

/**
 * ExcelJS Workbook을 파일로 다운로드
 */
export async function downloadWorkbook(workbook: Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 헤더 검증
 */
export async function validateExcelHeaders(file: File): Promise<{ valid: boolean; missing: string[] }> {
  try {
    const { Workbook } = await import('exceljs')
    const buffer = await file.arrayBuffer()
    const workbook = new Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      throw new Error('시트를 찾을 수 없습니다')
    }

    const headerRow = worksheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell) => {
      if (cell.value) {
        headers.push(String(cell.value).trim())
      }
    })

    const missing = REQUIRED_HEADERS.filter((required) => !headers.includes(required))

    return {
      valid: missing.length === 0,
      missing,
    }
  } catch {
    throw new Error('헤더 검증 중 오류가 발생했습니다')
  }
}

/**
 * 엑셀 파일을 파싱하여 StudentImportItem 배열로 변환
 */
export async function parseExcelFile(file: File): Promise<StudentImportItem[]> {
  try {
    const { Workbook } = await import('exceljs')
    const buffer = await file.arrayBuffer()
    const workbook = new Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      throw new Error('시트를 찾을 수 없습니다')
    }

    // 헤더 읽기 (1행)
    const headerRow = worksheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim()
    })

    // 데이터 행 읽기
    const rawData: { row: RawExcelRow; rowNumber: number }[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // 헤더 건너뛰기

      const obj: Record<string, string> = {}
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) {
          obj[header] = cellValueToString(cell.value)
        }
      })

      // 빈 셀에 기본값 '' 채우기 (xlsx sheet_to_json의 defval: '' 동작 재현)
      for (const header of headers) {
        if (!(header in obj)) {
          obj[header] = ''
        }
      }

      rawData.push({ row: obj as unknown as RawExcelRow, rowNumber })
    })

    // StudentImportItem으로 변환
    const items = rawData
      .map(({ row, rowNumber }) => convertRawRowToImportItem(row, rowNumber))
      .filter((item) => item !== null) as StudentImportItem[]

    return items
  } catch {
    throw new Error('엑셀 파일 파싱 중 오류가 발생했습니다')
  }
}

/**
 * 원시 엑셀 행 데이터를 StudentImportItem으로 변환
 */
function convertRawRowToImportItem(
  row: RawExcelRow,
  rowIndex: number
): StudentImportItem | null {
  // 빈 행 건너뛰기
  const name = row['학생 이름']?.trim()
  const birthDate = row['생년월일(YYYY-MM-DD)']?.trim()

  if (!name && !birthDate) {
    return null
  }

  // 학생 정보
  const student: StudentImportData = {
    name: name || '',
    birth_date: formatBirthDate(birthDate || ''),
    grade: row['학년']?.trim() || undefined,
    school: row['학교']?.trim() || undefined,
    student_phone: row['학생 연락처']?.trim() || undefined,
    notes: row['메모']?.trim() || undefined,
  }

  // 보호자 정보
  const guardians: GuardianImportData[] = []

  // 보호자1
  const guardian1Name = row['보호자1 이름']?.trim()
  if (guardian1Name) {
    guardians.push({
      name: guardian1Name,
      phone: row['보호자1 연락처']?.trim() || undefined,
      email: row['보호자1 이메일']?.trim() || undefined,
      relationship: row['보호자1 관계']?.trim() || undefined,
      occupation: row['보호자1 직업']?.trim() || undefined,
      address: row['보호자1 주소']?.trim() || undefined,
    })
  }

  // 보호자2
  const guardian2Name = row['보호자2 이름']?.trim()
  if (guardian2Name) {
    guardians.push({
      name: guardian2Name,
      phone: row['보호자2 연락처']?.trim() || undefined,
      email: row['보호자2 이메일']?.trim() || undefined,
      relationship: row['보호자2 관계']?.trim() || undefined,
      occupation: row['보호자2 직업']?.trim() || undefined,
      address: row['보호자2 주소']?.trim() || undefined,
    })
  }

  return StudentImportItem.create({
    rowIndex,
    student,
    guardians,
  })
}

/**
 * 생년월일 형식 변환 (다양한 형식 지원)
 */
function formatBirthDate(value: string): string {
  if (!value) return ''

  // 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  // YYYYMMDD 형식
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
  }

  // YYYY.MM.DD, YYYY/MM/DD 형식
  const dateMatch = value.match(/^(\d{4})[.\\/](\d{1,2})[.\\/](\d{1,2})$/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Excel 날짜 숫자인 경우 (1900-01-01 기준)
  const numValue = Number(value)
  if (!isNaN(numValue)) {
    const date = parseExcelDateCode(numValue)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  return value
}


/**
 * 클라이언트 측 기본 유효성 검사 (파일 내 중복 체크 포함)
 */
export function validateImportItems(
  items: StudentImportItem[]
): {
  valid: StudentImportItem[]
  invalid: Array<{ item: StudentImportItem; errors: string[] }>
  duplicatesInFile: Array<{ item: StudentImportItem; duplicateIndexes: number[] }>
} {
  const valid: StudentImportItem[] = []
  const invalid: Array<{ item: StudentImportItem; errors: string[] }> = []
  const duplicatesInFile: Array<{ item: StudentImportItem; duplicateIndexes: number[] }> = []

  // 중복 감지를 위한 맵 (key: "이름|생년월일")
  const seenStudents = new Map<string, number[]>()

  for (const item of items) {
    const validation = item.validateRequired()

    if (!validation.valid) {
      invalid.push({
        item,
        errors: validation.errors,
      })
      continue
    }

    // 파일 내 중복 체크
    const studentKey = `${item.student.name.toLowerCase()}|${item.student.birth_date}`
    const existingIndexes = seenStudents.get(studentKey)

    if (existingIndexes) {
      existingIndexes.push(item.rowIndex || 0)
      seenStudents.set(studentKey, existingIndexes)
    } else {
      seenStudents.set(studentKey, [item.rowIndex || 0])
      valid.push(item)
    }
  }

  // 중복된 항목들 수집
  for (const [, indexes] of seenStudents.entries()) {
    if (indexes.length > 1) {
      const firstItem = items.find((item) => item.rowIndex === indexes[0])
      if (firstItem) {
        duplicatesInFile.push({
          item: firstItem,
          duplicateIndexes: indexes.slice(1), // 첫 번째 제외한 나머지
        })
      }
    }
  }

  return { valid, invalid, duplicatesInFile }
}

/**
 * 오류 리포트 엑셀 파일 생성 및 다운로드
 */
export async function downloadErrorReport(
  items: StudentImportItem[],
  invalidItems: Array<{ item: StudentImportItem; errors: string[] }>
): Promise<void> {
  // 워크북 생성
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet('오류 리포트')

  // 오류 맵 생성 (rowIndex -> errors)
  const errorMap = new Map<number, string[]>()
  for (const { item, errors } of invalidItems) {
    if (item.rowIndex) {
      errorMap.set(item.rowIndex, errors)
    }
  }

  // 데이터 배열 생성 (헤더 + 오류 내용 컬럼)
  const headers = [...EXPECTED_HEADERS, '⚠️ 오류 내용']
  const dataRows: unknown[][] = []

  for (const item of items) {
    const row = [
      item.student.name,
      item.student.birth_date,
      item.student.grade || '',
      item.student.school || '',
      item.student.student_phone || '',
      '', // 학생 이메일 (현재 StudentImportData에 없음)
      item.student.notes || '',
      item.guardians[0]?.name || '',
      item.guardians[0]?.phone || '',
      item.guardians[0]?.email || '',
      item.guardians[0]?.relationship || '',
      item.guardians[0]?.occupation || '',
      item.guardians[0]?.address || '',
      item.guardians[1]?.name || '',
      item.guardians[1]?.phone || '',
      item.guardians[1]?.email || '',
      item.guardians[1]?.relationship || '',
      item.guardians[1]?.occupation || '',
      item.guardians[1]?.address || '',
    ]

    // 오류 메시지 추가
    const errors = item.rowIndex ? errorMap.get(item.rowIndex) : null
    row.push(errors ? errors.join(', ') : '')

    dataRows.push(row)
  }

  // 행 추가
  worksheet.addRows([headers, ...dataRows])

  // 열 너비 설정
  const colWidths = [12, 20, 10, 15, 15, 20, 20, 12, 15, 20, 15, 15, 20, 12, 15, 20, 15, 15, 20, 50]
  colWidths.forEach((w, i) => {
    worksheet.getColumn(i + 1).width = w
  })

  // 파일 다운로드
  const fileName = `학생_등록_오류리포트_${new Date().toISOString().split('T')[0]}.xlsx`
  await downloadWorkbook(workbook, fileName)
}
