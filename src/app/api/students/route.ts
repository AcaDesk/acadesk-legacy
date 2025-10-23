import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createGetStudentUseCase,
} from '@/application/factories/studentUseCaseFactory'
import { handleApiError } from '@/lib/error-handlers'

/**
 * GET /api/students
 * List all students with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant ID from user metadata
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const grade = searchParams.get('grade') || undefined
    const school = searchParams.get('school') || undefined

    const useCase = await createGetStudentUseCase()
    const students = await useCase.getAllByTenant(
      userData.tenant_id,
      { search, grade, school }
    )

    // Convert to DTOs
    const result = students.map(student => student.toDTO())

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/students
 *
 * REMOVED: This endpoint has been replaced by Server Actions.
 * Use createStudent() from @/app/actions/students instead.
 * See: src/app/actions/students.ts
 */
