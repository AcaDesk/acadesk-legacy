'use server'

import { unstable_cache } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { StudentDetailData } from '@/core/types/studentDetail.types'

interface StudentListItem {
  id: string
  student_code: string
  name: string
  email?: string | null
  phone?: string | null
  grade: string | null
  school: string | null
  enrollment_date: string | null
  birth_date: string | null
  student_phone: string | null
  profile_image_url: string | null
  commute_method?: string | null
  marketing_source?: string | null
  classes: Array<{
    id?: string | null
    name?: string | null
  }>
  guardians: Array<{
    id?: string | null
    name?: string | null
    phone?: string | null
  }>
  recentAttendance?: Array<{ status: string }>
}

/**
 * Get student detail with all related data
 *
 * @param studentId - Student ID
 * @returns Student detail data or error
 */
export async function getStudentDetail(studentId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Call RPC function to get complete student detail
    const { data, error: rpcError } = await serviceClient
      .rpc('get_student_detail', {
        p_student_id: studentId,
        p_tenant_id: tenantId,
      })
      .single()

    if (rpcError) {
      console.error('[getStudentDetail] RPC Error:', rpcError.message)
      throw rpcError
    }

    if (!data) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
        data: null,
      }
    }

    // 4. Return the data (DB already returns StudentDetailData format)
    return {
      success: true,
      error: null,
      data: data as StudentDetailData,
    }
  } catch (error) {
    console.error('[getStudentDetail] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * Get students with filters (service_role based)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Uses service_role to query students (bypasses RLS)
 * 3. Applies filters: grade, class, school, commute method, marketing source, enrollment date range
 * 4. Returns students with enrollment and guardian info
 *
 * @param filters - Filter criteria
 * @returns Students list or error
 */
export async function getStudents(filters?: {
  grade?: string
  classId?: string
  school?: string
  commuteMethod?: string
  marketingSource?: string
  enrollmentDateFrom?: string
  enrollmentDateTo?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    const page = filters?.page
    const pageSize = filters?.pageSize
    const shouldPaginate = Boolean(page && pageSize)
    const searchTerm = filters?.search?.trim().slice(0, 100) || ''

    if (searchTerm && shouldPaginate && page && pageSize) {
      const boundedPageSize = Math.min(Math.max(pageSize, 1), 100)
      const offset = (Math.max(page, 1) - 1) * boundedPageSize
      const { data: rows, error: searchError } = await serviceClient.rpc('search_students_list', {
        p_tenant_id: tenantId,
        p_search: searchTerm,
        p_grade: filters?.grade && filters.grade !== 'all' ? filters.grade : null,
        p_class_id: filters?.classId && filters.classId !== 'all' ? filters.classId : null,
        p_school: filters?.school && filters.school !== 'all' ? filters.school : null,
        p_commute_method: filters?.commuteMethod && filters.commuteMethod !== 'all' ? filters.commuteMethod : null,
        p_marketing_source: filters?.marketingSource && filters.marketingSource !== 'all' ? filters.marketingSource : null,
        p_enrollment_date_from: filters?.enrollmentDateFrom || null,
        p_enrollment_date_to: filters?.enrollmentDateTo || null,
        p_limit: boundedPageSize,
        p_offset: offset,
      })

      if (!searchError) {
        interface StudentSearchRpcRow {
          student: StudentListItem
        }

        const searchRows = (rows || []) as StudentSearchRpcRow[]
        const hasNextPage = searchRows.length > boundedPageSize
        const students = searchRows
          .slice(0, boundedPageSize)
          .map((row) => row.student as StudentListItem)

        return {
          success: true,
          data: students,
          totalCount: offset + students.length,
          totalCountExact: false,
          hasNextPage,
          page,
          pageSize: boundedPageSize,
          error: null,
        }
      }

      console.warn('[getStudents] Search RPC error, falling back to standard query:', searchError.message)
    }

    let classFilteredStudentIds: string[] | null = null
    if (filters?.classId && filters.classId !== 'all') {
      const { data: classEnrollments, error: classFilterError } = await serviceClient
        .from('class_enrollments')
        .select('student_id')
        .eq('tenant_id', tenantId)
        .eq('class_id', filters.classId)
        .eq('status', 'active')

      if (classFilterError) {
        console.error('[getStudents] Class filter error:', classFilterError.message)
        throw new Error('학생 조회에 실패했습니다')
      }

      classFilteredStudentIds = Array.from(
        new Set((classEnrollments || []).map((enrollment) => enrollment.student_id))
      )

      if (classFilteredStudentIds.length === 0) {
        return {
          success: true,
          data: [],
          totalCount: 0,
          totalCountExact: true,
          hasNextPage: false,
          page: page ?? 1,
          pageSize: pageSize ?? 0,
          error: null,
        }
      }
    }

    // 3. Build query
    let query = serviceClient
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        enrollment_date,
        birth_date,
        student_phone,
        profile_image_url,
        commute_method,
        marketing_source,
        users!inner (
          name,
          email,
          phone
        ),
        class_enrollments (
          id,
          status,
          classes (
            id,
            name
          )
        ),
        student_guardians (
          guardians (
            id,
            users (
              name,
              phone
            )
          )
        )
      `, { count: shouldPaginate ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (classFilteredStudentIds) {
      query = query.in('id', classFilteredStudentIds)
    }

    // 4. Apply filters
    if (filters?.grade && filters.grade !== 'all') {
      query = query.eq('grade', filters.grade)
    }

    if (filters?.school && filters.school !== 'all') {
      query = query.eq('school', filters.school)
    }

    if (filters?.commuteMethod && filters.commuteMethod !== 'all') {
      query = query.eq('commute_method', filters.commuteMethod)
    }

    if (filters?.marketingSource && filters.marketingSource !== 'all') {
      query = query.eq('marketing_source', filters.marketingSource)
    }

    if (filters?.enrollmentDateFrom) {
      query = query.gte('enrollment_date', filters.enrollmentDateFrom)
    }

    if (filters?.enrollmentDateTo) {
      query = query.lte('enrollment_date', filters.enrollmentDateTo)
    }

    if (filters?.search?.trim()) {
      const term = filters.search.trim().slice(0, 100)
      const safeTerm = term.replace(/[%_\\]/g, '\\$&')

      // users 테이블은 foreign table이므로 .or() 내에서 직접 cross-table OR 불가.
      // 먼저 name/phone 일치하는 user_id를 조회한 뒤 메인 쿼리에서 포함.
      const { data: matchingUsers } = await serviceClient
        .from('users')
        .select('id')
        .or(`name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`)
        .limit(500)

      const matchingUserIds = (matchingUsers ?? []).map((u) => u.id)

      const orParts = [
        `student_code.ilike.%${safeTerm}%`,
        `student_phone.ilike.%${safeTerm}%`,
      ]
      if (matchingUserIds.length > 0) {
        orParts.push(`user_id.in.(${matchingUserIds.join(',')})`)
      }
      query = query.or(orParts.join(','))
    }

    if (shouldPaginate && page && pageSize) {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    // 5. Execute query
    const { data: students, error, count } = await query

    if (error) {
      console.error('[getStudents] Query error:', error.message)
      throw new Error('학생 조회에 실패했습니다')
    }

    // 6. Transform data
    interface StudentQueryResult {
      id: string
      student_code: string
      grade: string | null
      school: string | null
      enrollment_date: string | null
      birth_date: string | null
      student_phone: string | null
      profile_image_url: string | null
      commute_method: string | null
      marketing_source: string | null
      users: { name: string; email: string | null; phone: string | null } | null
      class_enrollments: Array<{
        id: string
        status: string
        classes: { id: string; name: string } | null
      }> | null
      student_guardians: Array<{
        guardians: {
          id: string
          users: { name: string; phone: string | null } | null
        } | null
      }> | null
    }

    const transformedStudents: StudentListItem[] = (students as unknown as StudentQueryResult[])?.map((student) => ({
      id: student.id,
      student_code: student.student_code,
      name: student.users?.name || 'Unknown',
      email: student.users?.email,
      phone: student.users?.phone,
      grade: student.grade,
      school: student.school,
      enrollment_date: student.enrollment_date,
      birth_date: student.birth_date,
      student_phone: student.student_phone,
      profile_image_url: student.profile_image_url,
      commute_method: student.commute_method,
      marketing_source: student.marketing_source,
      classes: student.class_enrollments
        ?.filter((e) => e.status === 'active')
        .map((e) => ({
          id: e.classes?.id,
          name: e.classes?.name,
        })) || [],
      guardians: student.student_guardians?.map((sg) => ({
        id: sg.guardians?.id,
        name: sg.guardians?.users?.name,
        phone: sg.guardians?.users?.phone,
      })) || [],
    })) || []

    // 7. Batch-fetch recent attendance (last 30 days) for current page only
    const studentIds = transformedStudents.map(s => s.id)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const attendanceByStudentId = new Map<string, Array<{ status: string }>>()

    if (studentIds.length > 0) {
      const { data: recentAttendance, error: attendanceError } = await serviceClient
        .from('attendance')
        .select('student_id, status')
        .eq('tenant_id', tenantId)
        .in('student_id', studentIds)
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])

      if (attendanceError) {
        console.error('[getStudents] Attendance query error:', attendanceError.message)
      }

      for (const a of (recentAttendance || [])) {
        const list = attendanceByStudentId.get(a.student_id) || []
        list.push({ status: a.status })
        attendanceByStudentId.set(a.student_id, list)
      }
    }

    // Attach attendance data to each student
    const studentsWithAttendance = transformedStudents.map(s => ({
      ...s,
      recentAttendance: attendanceByStudentId.get(s.id) || [],
    }))

    return {
      success: true,
      data: studentsWithAttendance,
      totalCount: count ?? studentsWithAttendance.length,
      totalCountExact: shouldPaginate,
      hasNextPage: shouldPaginate && page && pageSize
        ? page * pageSize < (count ?? studentsWithAttendance.length)
        : false,
      page: page ?? 1,
      pageSize: pageSize ?? studentsWithAttendance.length,
      error: null,
    }
  } catch (error) {
    console.error('[getStudents] Error:', error)
    return {
      success: false,
      data: null,
      totalCount: 0,
      totalCountExact: true,
      hasNextPage: false,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 0,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get filter options for students (service_role based)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Uses service_role to query distinct values (bypasses RLS)
 * 3. Returns unique grades, schools, active classes
 *
 * @returns Filter options or error
 */
export async function getStudentFilterOptions() {
  try {
    const { tenantId } = await verifyStaff()

    // 5분 TTL — filter dropdown 옵션은 자주 안 변하고 5분 stale 허용 가능.
    // classes 변경은 `classes:${tenantId}` 태그도 함께 트리거되도록 묶음.
    return unstable_cache(
      async () => {
        const serviceClient = createServiceRoleClient()

        const [gradesResult, schoolsResult, classesResult] = await Promise.allSettled([
          serviceClient
            .from('students')
            .select('grade')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .not('grade', 'is', null)
            .order('grade', { ascending: true }),
          serviceClient
            .from('students')
            .select('school')
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .not('school', 'is', null)
            .order('school', { ascending: true }),
          serviceClient
            .from('classes')
            .select('id, name')
            .eq('tenant_id', tenantId)
            .eq('status', 'active')
            .order('name', { ascending: true }),
        ])

        interface GradeRow { grade: string | null }
        interface SchoolRow { school: string | null }

        const grades = gradesResult.status === 'fulfilled' && gradesResult.value.data
          ? Array.from(new Set((gradesResult.value.data as GradeRow[]).map((s) => s.grade).filter((g): g is string => g !== null)))
          : []

        const schools = schoolsResult.status === 'fulfilled' && schoolsResult.value.data
          ? Array.from(new Set((schoolsResult.value.data as SchoolRow[]).map((s) => s.school).filter((s): s is string => s !== null)))
          : []

        const classes = classesResult.status === 'fulfilled' && classesResult.value.data
          ? classesResult.value.data
          : []

        return {
          success: true as const,
          data: { grades, schools, classes },
          error: null,
        }
      },
      ['student-filter-options', tenantId],
      { revalidate: 300, tags: [`classes:${tenantId}`, `students:${tenantId}`] }
    )()
  } catch (error) {
    console.error('[getStudentFilterOptions] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

export interface StudentForMessaging {
  id: string
  student_code: string
  name: string
  phone: string | null
  grade: string | null
}

/**
 * 일괄 메시지 다이얼로그 전용: 학생 + 1순위 보호자 연락처
 *
 * 학생 자체에는 messaging 연락처가 없고, 보호자(`guardians.users.phone`)로 전송하므로
 * 첫 번째 보호자의 전화번호를 함께 반환합니다.
 */
export async function getStudentsForBulkMessaging(): Promise<{
  success: boolean
  data: StudentForMessaging[]
  error: string | null
}> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        users!inner ( name ),
        student_guardians (
          guardians (
            users ( phone )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('student_code')

    if (error) throw error

    interface StudentRow {
      id: string
      student_code: string
      grade: string | null
      users: { name: string } | null
      student_guardians: Array<{
        guardians: {
          users: { phone: string | null } | null
        } | null
      }> | null
    }

    const students: StudentForMessaging[] = ((data || []) as unknown as StudentRow[]).map((s) => {
      const guardianPhone = s.student_guardians?.[0]?.guardians?.users?.phone ?? null
      return {
        id: s.id,
        student_code: s.student_code,
        name: s.users?.name || '-',
        phone: guardianPhone,
        grade: s.grade,
      }
    })

    return { success: true, data: students, error: null }
  } catch (error) {
    console.error('[getStudentsForBulkMessaging] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}
