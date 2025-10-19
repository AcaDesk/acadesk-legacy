/**
 * Student Import Use Case Factories (Server-side)
 */

import { createClient } from '@/lib/supabase/server'
import { StudentImportRepository } from '@/infrastructure/database/student-import.repository'
import { PreviewStudentImportUseCase } from '@/application/use-cases/student/PreviewStudentImportUseCase'
import { ConfirmStudentImportUseCase } from '@/application/use-cases/student/ConfirmStudentImportUseCase'

/**
 * PreviewStudentImportUseCase 팩토리 (Server-side)
 */
export async function createPreviewStudentImportUseCase() {
  const supabase = await createClient()
  const repository = new StudentImportRepository(supabase)
  return new PreviewStudentImportUseCase(repository)
}

/**
 * ConfirmStudentImportUseCase 팩토리 (Server-side)
 */
export async function createConfirmStudentImportUseCase() {
  const supabase = await createClient()
  const repository = new StudentImportRepository(supabase)
  return new ConfirmStudentImportUseCase(repository)
}
