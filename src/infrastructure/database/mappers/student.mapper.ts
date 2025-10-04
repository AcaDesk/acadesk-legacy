import { Student, type StudentStatus } from "@/domain/entities/student.entity"

export interface StudentRecord {
  id: number
  tenant_id: string
  name: string
  grade: string
  status: string
  attendance_rate: number
  last_activity_date: string
  created_at: string
  updated_at: string | null
  deleted_at: string | null
}

/**
 * Student Mapper
 * Database ↔ Domain Entity 변환
 */
export class StudentMapper {
  static toDomain(record: StudentRecord): Student {
    return Student.create({
      id: record.id,
      name: record.name,
      grade: record.grade,
      status: record.status as StudentStatus,
      attendanceRate: `${record.attendance_rate}%`,
      lastActivityDate: record.last_activity_date,
      createdAt: record.created_at,
      updatedAt: record.updated_at || record.created_at,
    })
  }

  static toDomainList(records: StudentRecord[]): Student[] {
    return records.map((record) => this.toDomain(record))
  }
}
