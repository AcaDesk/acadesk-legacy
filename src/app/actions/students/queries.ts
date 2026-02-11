'use server'

import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { StudentDetailData } from '@/core/types/studentDetail.types'

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
      console.error('[getStudentDetail] RPC Error:', {
        studentId,
        tenantId,
        error: rpcError,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      })
      throw rpcError
    }

    if (!data) {
      console.log('[getStudentDetail] Student not found:', {
        studentId,
        tenantId,
      })
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
}) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

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
        users (
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
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

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

    // 5. Execute query
    const { data: students, error } = await query

    console.log('[getStudents] Query result:', {
      studentsCount: students?.length || 0,
      error: error?.message,
      tenantId
    })

    if (error) {
      console.error('[getStudents] Query error:', error)
      throw new Error(`학생 조회 실패: ${error.message}`)
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

    const transformedStudents = (students as unknown as StudentQueryResult[])?.map((student) => ({
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

    // 7. Batch-fetch recent attendance (last 30 days) for badge display
    const studentIds = transformedStudents.map(s => s.id)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const attendanceByStudentId = new Map<string, Array<{ status: string }>>()

    if (studentIds.length > 0) {
      const { data: recentAttendance } = await serviceClient
        .from('attendance')
        .select('student_id, status')
        .eq('tenant_id', tenantId)
        .in('student_id', studentIds)
        .gte('attendance_date', thirtyDaysAgo.toISOString().split('T')[0])

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

    // 8. Filter by class if specified (post-query filter for simplicity)
    let filteredStudents = studentsWithAttendance
    if (filters?.classId && filters.classId !== 'all') {
      filteredStudents = studentsWithAttendance.filter(s =>
        s.classes.some((c) => c.id === filters.classId)
      )
    }

    console.log('[getStudents] Returning data:', {
      totalStudents: studentsWithAttendance.length,
      filteredStudents: filteredStudents.length,
      filters
    })

    return {
      success: true,
      data: filteredStudents,
      error: null,
    }
  } catch (error) {
    console.error('[getStudents] Error:', error)
    return {
      success: false,
      data: null,
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
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Fetch filter options in parallel
    const [gradesResult, schoolsResult, classesResult] = await Promise.allSettled([
      // Unique grades
      serviceClient
        .from('students')
        .select('grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('grade', 'is', null)
        .order('grade', { ascending: true }),

      // Unique schools
      serviceClient
        .from('students')
        .select('school')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('school', 'is', null)
        .order('school', { ascending: true }),

      // Active classes
      serviceClient
        .from('classes')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name', { ascending: true }),
    ])

    // 4. Process results
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
      success: true,
      data: {
        grades,
        schools,
        classes,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getStudentFilterOptions] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
