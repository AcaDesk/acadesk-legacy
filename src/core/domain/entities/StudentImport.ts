/**
 * StudentImport Entity
 * 엑셀 파일을 통한 학생 일괄 등록 도메인 엔티티
 */

/**
 * guardians 테이블 구조에 맞춘 보호자 정보
 * (student_guardians 연결 정보는 일괄 등록 시 기본값 사용)
 */
export interface GuardianImportData {
  name: string
  phone?: string
  email?: string
  relationship?: string
  occupation?: string
  address?: string
}

export interface StudentImportData {
  name: string
  birth_date: string // YYYY-MM-DD
  grade?: string
  school?: string
  student_phone?: string
  student_code?: string
  notes?: string
}

export interface StudentImportItemProps {
  rowIndex?: number
  student: StudentImportData
  guardians: GuardianImportData[]
}

/**
 * 엑셀 업로드 시 한 행의 데이터를 나타내는 엔티티
 */
export class StudentImportItem {
  private constructor(private readonly props: StudentImportItemProps) {}

  static create(props: StudentImportItemProps): StudentImportItem {
    return new StudentImportItem(props)
  }

  get rowIndex(): number | undefined {
    return this.props.rowIndex
  }

  get student(): StudentImportData {
    return this.props.student
  }

  get guardians(): GuardianImportData[] {
    return this.props.guardians
  }

  /**
   * 필수 필드 검증
   */
  validateRequired(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.props.student.name?.trim()) {
      errors.push('학생 이름은 필수입니다')
    }

    if (!this.props.student.birth_date) {
      errors.push('생년월일은 필수입니다')
    }

    // 생년월일 형식 검증 (YYYY-MM-DD)
    if (this.props.student.birth_date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/
      if (!datePattern.test(this.props.student.birth_date)) {
        errors.push('생년월일은 YYYY-MM-DD 형식이어야 합니다')
      }
    }

    // 보호자 정보 검증 (최소 1명 필수)
    if (this.props.guardians.length === 0) {
      errors.push('최소 1명의 보호자 정보는 필수입니다')
    } else {
      this.props.guardians.forEach((guardian, index) => {
        if (!guardian.name?.trim()) {
          errors.push(`보호자 ${index + 1}의 이름은 필수입니다`)
        }
      })
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * JSON 변환 (RPC 호출용)
   */
  toJSON(): Record<string, unknown> {
    return {
      student: this.props.student,
      guardians: this.props.guardians,
    }
  }
}
