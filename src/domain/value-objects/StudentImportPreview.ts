/**
 * StudentImportPreview Value Object
 * 학생 Import 미리보기 결과
 */

import type { StudentImportData, GuardianImportData } from '../entities/StudentImport'

export interface ImportSummary {
  total: number
  newCount: number
  dupCount: number
  errorCount: number
}

export interface NewStudentItem {
  rowIndex: number
  student: StudentImportData
  guardians: GuardianImportData[]
}

export interface DuplicateStudentItem {
  rowIndex: number
  student: StudentImportData
  existingStudent: {
    id: string
    grade?: string
    school?: string
    student_phone?: string
    student_code?: string
    notes?: string
  }
  guardians: GuardianImportData[]
}

export interface ImportErrorItem {
  rowIndex: number
  reason: string
}

export interface StudentImportPreviewProps {
  success: boolean
  message?: string
  summary?: ImportSummary
  new?: NewStudentItem[]
  duplicates?: DuplicateStudentItem[]
  errors?: ImportErrorItem[]
}

/**
 * 학생 Import 미리보기 결과를 나타내는 Value Object
 * RPC 함수의 반환값을 타입 안전하게 다루기 위한 객체
 */
export class StudentImportPreview {
  private constructor(private readonly props: StudentImportPreviewProps) {}

  static create(props: StudentImportPreviewProps): StudentImportPreview {
    return new StudentImportPreview(props)
  }

  static fromRPCResult(result: unknown): StudentImportPreview {
    const data = result as StudentImportPreviewProps
    return StudentImportPreview.create(data)
  }

  get success(): boolean {
    return this.props.success
  }

  get message(): string | undefined {
    return this.props.message
  }

  get summary(): ImportSummary | undefined {
    return this.props.summary
  }

  get newStudents(): NewStudentItem[] {
    return this.props.new || []
  }

  get duplicateStudents(): DuplicateStudentItem[] {
    return this.props.duplicates || []
  }

  get errors(): ImportErrorItem[] {
    return this.props.errors || []
  }

  /**
   * 에러가 있는지 확인
   */
  hasErrors(): boolean {
    return (this.props.errors?.length || 0) > 0
  }

  /**
   * 중복이 있는지 확인
   */
  hasDuplicates(): boolean {
    return (this.props.duplicates?.length || 0) > 0
  }

  /**
   * Import 가능한 데이터가 있는지 확인
   */
  hasImportableData(): boolean {
    return (this.props.new?.length || 0) > 0 || (this.props.duplicates?.length || 0) > 0
  }

  /**
   * 특정 중복 처리 전략에 따라 실제로 처리될 항목 수 계산
   */
  getProcessableCount(onDuplicate: 'skip' | 'update'): number {
    const newCount = this.props.new?.length || 0
    const dupCount = this.props.duplicates?.length || 0

    if (onDuplicate === 'skip') {
      return newCount
    }
    return newCount + dupCount
  }
}
