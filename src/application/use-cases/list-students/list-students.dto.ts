import type { StudentDTO, StudentStatus } from "@/domain/entities/student.entity"

export interface ListStudentsInput {
  tenantId: string
  status?: StudentStatus[]
  grade?: string[]
  search?: string
  page?: number
  pageSize?: number
}

export interface ListStudentsOutput {
  students: StudentDTO[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
