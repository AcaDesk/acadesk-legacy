import { AttendanceRate } from "../value-objects/attendance-rate.vo"
import { StudentGrade } from "../value-objects/student-grade.vo"

export type StudentStatus = "활동중" | "휴학" | "졸업" | "미활동"

export interface StudentProps {
  id: number
  name: string
  grade: string
  status: StudentStatus
  attendanceRate: string
  lastActivityDate: string
  createdAt?: string
  updatedAt?: string
}

export interface StudentDTO {
  id: number
  name: string
  grade: string
  status: StudentStatus
  attendanceRate: string
  lastActivityDate: string
  createdAt: string
  updatedAt: string
}

/**
 * Student Entity
 * 학생 도메인의 핵심 엔티티
 */
export class Student {
  private constructor(
    private readonly id: number,
    private readonly name: string,
    private readonly grade: StudentGrade,
    private readonly status: StudentStatus,
    private readonly attendanceRate: AttendanceRate,
    private readonly lastActivityDate: Date,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  static create(props: StudentProps): Student {
    return new Student(
      props.id,
      props.name,
      StudentGrade.create(props.grade),
      props.status,
      AttendanceRate.fromPercentageString(props.attendanceRate),
      new Date(props.lastActivityDate),
      props.createdAt ? new Date(props.createdAt) : new Date(),
      props.updatedAt ? new Date(props.updatedAt) : new Date()
    )
  }

  // Getters
  getId(): number {
    return this.id
  }

  getName(): string {
    return this.name
  }

  getGrade(): StudentGrade {
    return this.grade
  }

  getStatus(): StudentStatus {
    return this.status
  }

  getAttendanceRate(): AttendanceRate {
    return this.attendanceRate
  }

  getLastActivityDate(): Date {
    return this.lastActivityDate
  }

  // Business Logic
  isActive(): boolean {
    return this.status === "활동중"
  }

  needsAttentionForAttendance(): boolean {
    return this.attendanceRate.isPoor()
  }

  isRecentlyActive(withinDays: number = 30): boolean {
    const now = new Date()
    const diffMs = now.getTime() - this.lastActivityDate.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    return diffDays <= withinDays
  }

  toDTO(): StudentDTO {
    return {
      id: this.id,
      name: this.name,
      grade: this.grade.getValue(),
      status: this.status,
      attendanceRate: this.attendanceRate.toPercentageString(),
      lastActivityDate: this.lastActivityDate.toISOString().split("T")[0],
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    }
  }
}
