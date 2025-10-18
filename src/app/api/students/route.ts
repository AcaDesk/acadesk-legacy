import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createGetStudentUseCase,
  createCreateStudentUseCase
} from '@/application/factories/studentUseCaseFactory'
import { handleError } from '@/lib/errors'
import * as z from 'zod'

const createStudentSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2),
  birthDate: z.string().optional().transform(val => val ? new Date(val) : null),
  gender: z.enum(['male', 'female', 'other']).optional(),
  studentPhone: z.string().optional(),
  profileImageUrl: z.string().optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
  enrollmentDate: z.string().optional().transform(val => val ? new Date(val) : new Date()),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
  commuteMethod: z.string().optional(),
  marketingSource: z.string().optional(),
  kioskPin: z.string().optional(),
})

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
    const errorResponse = handleError(error)
    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}

/**
 * POST /api/students
 * Create a new student
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validated = createStudentSchema.parse({
      ...body,
      tenantId: userData.tenant_id,
    })

    const useCase = await createCreateStudentUseCase()
    const student = await useCase.execute(validated)

    return NextResponse.json(student.toDTO(), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    const errorResponse = handleError(error)
    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
