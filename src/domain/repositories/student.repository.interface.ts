import { Student, type StudentStatus } from "../entities/student.entity"

export interface StudentFilter {
  tenantId: string
  status?: StudentStatus[]
  grade?: string[]
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  limit?: number
  offset?: number
}

export interface CreateStudentInput {
  tenantId: string
  name: string
  grade: string
  status: StudentStatus
  attendanceRate: string
  lastActivityDate: string
}

export interface UpdateStudentInput {
  name?: string
  grade?: string
  status?: StudentStatus
  attendanceRate?: string
  lastActivityDate?: string
}

/**
 * Student Repository Interface
 * 학생 데이터 접근을 추상화
 */
export interface IStudentRepository {
  findAll(filter: StudentFilter): Promise<Student[]>
  findById(id: number): Promise<Student | null>
  create(input: CreateStudentInput): Promise<Student>
  update(id: number, input: UpdateStudentInput): Promise<Student>
  delete(id: number): Promise<void>
  count(filter?: StudentFilter): Promise<number>
  countActive(): Promise<number>
  getAverageAttendanceRate(): Promise<number>
}
