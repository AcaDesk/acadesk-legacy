import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StudentRepository } from '@/services/data/student.repository'
import { handleError } from '@/lib/errors'
import * as z from 'zod'

const updateStudentSchema = z.object({
  name: z.string().min(2).optional(),
  grade_level: z.string().optional(),
  status: z.string().optional(),
  enrollment_date: z.string().optional(),
  withdrawal_date: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

/**
 * GET /api/students/[id]
 * Get a single student by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const repository = new StudentRepository(supabase)
    const student = await repository.findByIdWithGuardians(id)

    return NextResponse.json(student)
  } catch (error) {
    const errorResponse = handleError(error)
    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}

/**
 * PATCH /api/students/[id]
 * Update a student
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = updateStudentSchema.parse(body)

    const repository = new StudentRepository(supabase)
    const student = await repository.update(id, validated)

    return NextResponse.json(student)
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

/**
 * DELETE /api/students/[id]
 * Soft delete a student
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const repository = new StudentRepository(supabase)
    await repository.softDelete(id)

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    const errorResponse = handleError(error)
    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
