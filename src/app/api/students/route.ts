import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudentRepository } from '@/services/data/student.repository'
import { handleError } from '@/lib/errors'
import { paginationSchema, searchSchema, sortSchema } from '@/lib/validators'
import * as z from 'zod'

const createStudentSchema = z.object({
  tenant_id: z.string().uuid(),
  student_code: z.string().optional(),
  name: z.string().min(2),
  grade_level: z.string().optional(),
  status: z.string().default('active'),
  enrollment_date: z.string().optional(),
  meta: z.record(z.unknown()).default({}),
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      sort_by: searchParams.get('sort_by') || 'created_at',
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    }

    const repository = new StudentRepository(supabase)
    const result = await repository.findAll(params)

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

    // Parse and validate request body
    const body = await request.json()
    const validated = createStudentSchema.parse(body)

    const repository = new StudentRepository(supabase)
    const student = await repository.create(validated)

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
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
