/**
 * Excel Parser Utility
 * sheetjs/xlsx를 사용한 엑셀 파일 파싱 유틸리티
 */

import * as XLSX from 'xlsx'
import type {
  StudentImportData,
  GuardianImportData,
} from '@/domain/entities/StudentImport'
import { StudentImportItem } from '@/domain/entities/StudentImport'

/**
 * 필수 헤더 목록
 */
const REQUIRED_HEADERS = ['학생 이름*', '생년월일(YYYY-MM-DD)*', '보호자1 연락처*'] as const

/**
 * 모든 예상 헤더 목록 (순서대로)
 */
const EXPECTED_HEADERS = [
  '학생 이름*',
  '생년월일(YYYY-MM-DD)*',
  '학년',
  '학교',
  '학생 연락처',
  '학생 코드',
  '메모',
  '보호자1 관계',
  '보호자1 이름',
  '보호자1 연락처*',
  '보호자1 주보호자',
  '보호자1 픽업가능',
  '보호자1 성적조회가능',
  '보호자2 관계',
  '보호자2 이름',
  '보호자2 연락처',
  '보호자2 주보호자',
  '보호자2 픽업가능',
  '보호자2 성적조회가능',
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
  '학생 코드'?: string
  '메모'?: string
  '보호자1 관계'?: string
  '보호자1 이름'?: string
  '보호자1 연락처'?: string
  '보호자1 주보호자'?: string
  '보호자1 픽업가능'?: string
  '보호자1 성적조회가능'?: string
  '보호자2 관계'?: string
  '보호자2 이름'?: string
  '보호자2 연락처'?: string
  '보호자2 주보호자'?: string
  '보호자2 픽업가능'?: string
  '보호자2 성적조회가능'?: string
}

/**
 * 헤더 검증
 */
export function validateExcelHeaders(file: File): Promise<{ valid: boolean; missing: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 첫 번째 행(헤더) 읽기
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        const headers: string[] = []

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
          const cell = worksheet[cellAddress]
          if (cell && cell.v) {
            headers.push(String(cell.v).trim())
          }
        }

        // 필수 헤더 체크
        const missing = REQUIRED_HEADERS.filter((required) => !headers.includes(required))

        resolve({
          valid: missing.length === 0,
          missing,
        })
      } catch (error) {
        reject(new Error('헤더 검증 중 오류가 발생했습니다'))
      }
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * 엑셀 파일을 파싱하여 StudentImportItem 배열로 변환
 */
export async function parseExcelFile(file: File): Promise<StudentImportItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // 첫 번째 시트만 처리
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // JSON 변환
        const rawData: RawExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        })

        // StudentImportItem으로 변환
        const items = rawData
          .map((row, index) => convertRawRowToImportItem(row, index + 2)) // +2 는 헤더 행 고려
          .filter((item) => item !== null) as StudentImportItem[]

        resolve(items)
      } catch (error) {
        reject(new Error('엑셀 파일 파싱 중 오류가 발생했습니다'))
      }
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다'))
    }

    reader.readAsBinaryString(file)
  })
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
    student_code: row['학생 코드']?.trim() || undefined,
    notes: row['메모']?.trim() || undefined,
  }

  // 보호자 정보
  const guardians: GuardianImportData[] = []

  // 보호자1
  const guardian1Phone = row['보호자1 연락처']?.trim()
  if (guardian1Phone) {
    guardians.push({
      emergency_phone: guardian1Phone,
      relationship: row['보호자1 관계']?.trim() || undefined,
      is_primary: parseBooleanField(row['보호자1 주보호자']),
      can_pickup: parseBooleanField(row['보호자1 픽업가능']),
      can_view_reports: parseBooleanField(row['보호자1 성적조회가능']),
    })
  }

  // 보호자2
  const guardian2Phone = row['보호자2 연락처']?.trim()
  if (guardian2Phone) {
    guardians.push({
      emergency_phone: guardian2Phone,
      relationship: row['보호자2 관계']?.trim() || undefined,
      is_primary: parseBooleanField(row['보호자2 주보호자']),
      can_pickup: parseBooleanField(row['보호자2 픽업가능']),
      can_view_reports: parseBooleanField(row['보호자2 성적조회가능']),
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
    const date = XLSX.SSF.parse_date_code(numValue)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  return value
}

/**
 * Boolean 필드 파싱
 */
function parseBooleanField(value: string | undefined): boolean | undefined {
  if (!value) return undefined

  const normalized = value.trim().toLowerCase()

  if (['o', 'x', 'y', 'n', 'true', 'false', '예', '아니오'].includes(normalized)) {
    return ['o', 'y', 'true', '예'].includes(normalized)
  }

  return undefined
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
  for (const [key, indexes] of seenStudents.entries()) {
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
export function downloadErrorReport(
  items: StudentImportItem[],
  invalidItems: Array<{ item: StudentImportItem; errors: string[] }>
): void {
  // 워크북 생성
  const workbook = XLSX.utils.book_new()

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
      item.student.student_code || '',
      item.student.notes || '',
      item.guardians[0]?.relationship || '',
      '', // 보호자1 이름 (템플릿에는 있지만 데이터에는 없음)
      item.guardians[0]?.emergency_phone || '',
      item.guardians[0]?.is_primary ? 'O' : 'X',
      item.guardians[0]?.can_pickup ? 'O' : 'X',
      item.guardians[0]?.can_view_reports ? 'O' : 'X',
      item.guardians[1]?.relationship || '',
      '', // 보호자2 이름
      item.guardians[1]?.emergency_phone || '',
      item.guardians[1]?.is_primary ? 'O' : 'X',
      item.guardians[1]?.can_pickup ? 'O' : 'X',
      item.guardians[1]?.can_view_reports ? 'O' : 'X',
    ]

    // 오류 메시지 추가
    const errors = item.rowIndex ? errorMap.get(item.rowIndex) : null
    row.push(errors ? errors.join(', ') : '')

    dataRows.push(row)
  }

  // 시트 생성
  const wsData = [headers, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(wsData)

  // 열 너비 설정
  const colWidths = [
    { wch: 12 }, // 학생 이름
    { wch: 20 }, // 생년월일
    { wch: 10 }, // 학년
    { wch: 15 }, // 학교
    { wch: 15 }, // 학생 연락처
    { wch: 12 }, // 학생 코드
    { wch: 20 }, // 메모
    { wch: 15 }, // 보호자1 관계
    { wch: 12 }, // 보호자1 이름
    { wch: 15 }, // 보호자1 연락처
    { wch: 15 }, // 보호자1 주보호자
    { wch: 15 }, // 보호자1 픽업가능
    { wch: 18 }, // 보호자1 성적조회가능
    { wch: 15 }, // 보호자2 관계
    { wch: 12 }, // 보호자2 이름
    { wch: 15 }, // 보호자2 연락처
    { wch: 15 }, // 보호자2 주보호자
    { wch: 15 }, // 보호자2 픽업가능
    { wch: 18 }, // 보호자2 성적조회가능
    { wch: 50 }, // 오류 내용
  ]
  worksheet['!cols'] = colWidths

  // 시트 추가
  XLSX.utils.book_append_sheet(workbook, worksheet, '오류 리포트')

  // 파일 다운로드
  const fileName = `학생_등록_오류리포트_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
