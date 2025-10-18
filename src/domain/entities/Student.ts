/**
 * Student Entity
 * 학생 도메인 엔티티 - 비즈니스 로직 포함
 */

import { StudentCode } from '../value-objects/StudentCode'

export interface StudentProps {
  id: string
  tenantId: string
  userId: string | null
  studentCode: StudentCode
  name: string
  birthDate: Date | null
  gender: 'male' | 'female' | 'other' | null
  studentPhone: string | null
  profileImageUrl: string | null
  grade: string | null
  school: string | null
  enrollmentDate: Date
  withdrawalDate: Date | null
  emergencyContact: string | null
  notes: string | null
  commuteMethod: string | null
  marketingSource: string | null
  kioskPin: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export class Student {
  private constructor(private props: StudentProps) {}

  static create(props: Omit<StudentProps, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> & { id?: string }): Student {
    const now = new Date()
    return new Student({
      ...props,
      id: props.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static fromDatabase(props: StudentProps): Student {
    return new Student(props)
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get tenantId(): string {
    return this.props.tenantId
  }

  get studentCode(): StudentCode {
    return this.props.studentCode
  }

  get name(): string {
    return this.props.name
  }

  get birthDate(): Date | null {
    return this.props.birthDate
  }

  get gender(): 'male' | 'female' | 'other' | null {
    return this.props.gender
  }

  get studentPhone(): string | null {
    return this.props.studentPhone
  }

  get profileImageUrl(): string | null {
    return this.props.profileImageUrl
  }

  get grade(): string | null {
    return this.props.grade
  }

  get school(): string | null {
    return this.props.school
  }

  get enrollmentDate(): Date {
    return this.props.enrollmentDate
  }

  get withdrawalDate(): Date | null {
    return this.props.withdrawalDate
  }

  get emergencyContact(): string | null {
    return this.props.emergencyContact
  }

  get notes(): string | null {
    return this.props.notes
  }

  get commuteMethod(): string | null {
    return this.props.commuteMethod
  }

  get marketingSource(): string | null {
    return this.props.marketingSource
  }

  get kioskPin(): string | null {
    return this.props.kioskPin
  }

  get isWithdrawn(): boolean {
    return this.props.withdrawalDate !== null
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null
  }

  // Business Logic Methods

  /**
   * 학생 연령 계산
   */
  getAge(): number | null {
    if (!this.props.birthDate) return null
    const today = new Date()
    const birthDate = this.props.birthDate
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  /**
   * 재학 기간 계산 (일 단위)
   */
  getEnrollmentDuration(): number {
    const endDate = this.props.withdrawalDate || new Date()
    const diffTime = Math.abs(endDate.getTime() - this.props.enrollmentDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 학생 정보 업데이트
   */
  update(updates: Partial<Omit<StudentProps, 'id' | 'tenantId' | 'studentCode' | 'createdAt'>>): Student {
    return new Student({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    })
  }

  /**
   * 학생 탈퇴 처리
   */
  withdraw(withdrawalDate?: Date): Student {
    return new Student({
      ...this.props,
      withdrawalDate: withdrawalDate || new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * 소프트 삭제
   */
  softDelete(): Student {
    return new Student({
      ...this.props,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  /**
   * 데이터베이스 저장용 Plain Object로 변환
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.props.id,
      tenant_id: this.props.tenantId,
      user_id: this.props.userId,
      student_code: this.props.studentCode.getValue(),
      name: this.props.name,
      birth_date: this.props.birthDate?.toISOString(),
      gender: this.props.gender,
      student_phone: this.props.studentPhone,
      profile_image_url: this.props.profileImageUrl,
      grade: this.props.grade,
      school: this.props.school,
      enrollment_date: this.props.enrollmentDate.toISOString(),
      withdrawal_date: this.props.withdrawalDate?.toISOString(),
      emergency_contact: this.props.emergencyContact,
      notes: this.props.notes,
      commute_method: this.props.commuteMethod,
      marketing_source: this.props.marketingSource,
      kiosk_pin: this.props.kioskPin,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString(),
    }
  }

  /**
   * DTO로 변환 (UI 레이어용)
   */
  toDTO(): StudentDTO {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      userId: this.props.userId,
      studentCode: this.props.studentCode.getValue(),
      name: this.props.name,
      birthDate: this.props.birthDate,
      age: this.getAge(),
      gender: this.props.gender,
      studentPhone: this.props.studentPhone,
      profileImageUrl: this.props.profileImageUrl,
      grade: this.props.grade,
      school: this.props.school,
      enrollmentDate: this.props.enrollmentDate,
      enrollmentDuration: this.getEnrollmentDuration(),
      withdrawalDate: this.props.withdrawalDate,
      isWithdrawn: this.isWithdrawn,
      emergencyContact: this.props.emergencyContact,
      notes: this.props.notes,
      commuteMethod: this.props.commuteMethod,
      marketingSource: this.props.marketingSource,
      kioskPin: this.props.kioskPin,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }
}

export interface StudentDTO {
  id: string
  tenantId: string
  userId: string | null
  studentCode: string
  name: string
  birthDate: Date | null
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  studentPhone: string | null
  profileImageUrl: string | null
  grade: string | null
  school: string | null
  enrollmentDate: Date
  enrollmentDuration: number
  withdrawalDate: Date | null
  isWithdrawn: boolean
  emergencyContact: string | null
  notes: string | null
  commuteMethod: string | null
  marketingSource: string | null
  kioskPin: string | null
  createdAt: Date
  updatedAt: Date
}
