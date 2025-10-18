import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createGetStudentUseCase,
  createUpdateStudentUseCase,
  createDeleteStudentUseCase,
} from '@/application/factories/studentUseCaseFactory'
import { handleError } from '@/lib/errors'
import * as z from 'zod'

const updateStudentSchema = z.object({
  name: z.string().min(2).optional(),
  birthDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  gender: z.enum(['male', 'female', 'other']).optional(),
  studentPhone: z.string().optional(),
  profileImageUrl: z.string().optional(),
  grade: z.string().optional(),
  school: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional(),
  commuteMethod: z.string().optional(),
  marketingSource: z.string().optional(),
  kioskPin: z.string().optional(),
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

    const useCase = await createGetStudentUseCase()
    const student = await useCase.getByIdOrThrow(id)

    return NextResponse.json(student.toDTO())
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

    const useCase = await createUpdateStudentUseCase()
    const student = await useCase.execute({
      id,
      ...validated,
    })

    return NextResponse.json(student.toDTO())
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

    const useCase = await createDeleteStudentUseCase()
    await useCase.execute(id)

    return NextResponse.json({ message: 'Student deleted successfully' })
  } catch (error) {
    const errorResponse = handleError(error)
    return NextResponse.json(
      { error: errorResponse.message, code: errorResponse.code },
      { status: errorResponse.statusCode }
    )
  }
}
