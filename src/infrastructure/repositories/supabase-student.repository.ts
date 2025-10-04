import type { SupabaseClient } from "@supabase/supabase-js"
import type { Student } from "@/domain/entities/student.entity"
import type {
  IStudentRepository,
  StudentFilter,
  CreateStudentInput,
  UpdateStudentInput,
} from "@/domain/repositories/student.repository.interface"
import { StudentMapper, type StudentRecord } from "../database/mappers/student.mapper"

export class SupabaseStudentRepository implements IStudentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findAll(filter: StudentFilter): Promise<Student[]> {
    let query = this.supabase
      .from("students")
      .select("*")
      .eq("tenant_id", filter.tenantId)
      .is("deleted_at", null)

    if (filter.status && filter.status.length > 0) {
      query = query.in("status", filter.status)
    }

    if (filter.grade && filter.grade.length > 0) {
      query = query.in("grade", filter.grade)
    }

    if (filter.search) {
      query = query.ilike("name", `%${filter.search}%`)
    }

    if (filter.sortBy) {
      const column = this.mapSortColumn(filter.sortBy)
      const ascending = filter.sortOrder === "asc"
      query = query.order(column, { ascending })
    }

    if (filter.limit) {
      query = query.limit(filter.limit)
    }

    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    if (!data) {
      return []
    }

    return StudentMapper.toDomainList(data as StudentRecord[])
  }

  async findById(id: number): Promise<Student | null> {
    const { data, error } = await this.supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null
      }
      throw new Error(`Failed to fetch student: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return StudentMapper.toDomain(data as StudentRecord)
  }

  async create(input: CreateStudentInput): Promise<Student> {
    const { data, error } = await this.supabase
      .from("students")
      .insert({
        tenant_id: input.tenantId,
        name: input.name,
        grade: input.grade,
        status: input.status,
        attendance_rate: parseFloat(input.attendanceRate.replace("%", "")),
        last_activity_date: input.lastActivityDate,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create student: ${error.message}`)
    }

    return StudentMapper.toDomain(data as StudentRecord)
  }

  async update(id: number, updateData: UpdateStudentInput): Promise<Student> {
    const updatePayload: Record<string, string | number> = {}

    if (updateData.name) updatePayload.name = updateData.name
    if (updateData.grade) updatePayload.grade = updateData.grade
    if (updateData.status) updatePayload.status = updateData.status
    if (updateData.attendanceRate) {
      updatePayload.attendance_rate = parseFloat(
        updateData.attendanceRate.replace("%", "")
      )
    }
    if (updateData.lastActivityDate) {
      updatePayload.last_activity_date = updateData.lastActivityDate
    }

    updatePayload.updated_at = new Date().toISOString()

    const { data, error } = await this.supabase
      .from("students")
      .update(updatePayload)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update student: ${error.message}`)
    }

    return StudentMapper.toDomain(data as StudentRecord)
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("students")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      throw new Error(`Failed to delete student: ${error.message}`)
    }
  }

  async count(filter?: StudentFilter): Promise<number> {
    let query = this.supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)

    if (filter?.tenantId) {
      query = query.eq("tenant_id", filter.tenantId)
    }

    if (filter?.status && filter.status.length > 0) {
      query = query.in("status", filter.status)
    }

    if (filter?.grade && filter.grade.length > 0) {
      query = query.in("grade", filter.grade)
    }

    if (filter?.search) {
      query = query.ilike("name", `%${filter.search}%`)
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count students: ${error.message}`)
    }

    return count || 0
  }

  async countActive(): Promise<number> {
    const { count, error } = await this.supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "활동중")
      .is("deleted_at", null)

    if (error) {
      throw new Error(`Failed to count active students: ${error.message}`)
    }

    return count || 0
  }

  async getAverageAttendanceRate(): Promise<number> {
    const { data, error } = await this.supabase
      .from("students")
      .select("attendance_rate")
      .is("deleted_at", null)

    if (error) {
      throw new Error(`Failed to get average attendance rate: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return 0
    }

    const sum = data.reduce((acc, row) => acc + (row.attendance_rate || 0), 0)
    return sum / data.length
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: "name",
      grade: "grade",
      attendanceRate: "attendance_rate",
      lastActivityDate: "last_activity_date",
    }

    return columnMap[sortBy] || "created_at"
  }
}
