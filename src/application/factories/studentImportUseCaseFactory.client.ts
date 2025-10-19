/**
 * Student Import Use Case Factories (Client-side)
 */

import { createClient } from '@/lib/supabase/client'
import { StudentImportRepository } from '@/infrastructure/database/student-import.repository'
import { PreviewStudentImportUseCase } from '@/application/use-cases/student/PreviewStudentImportUseCase'
import { ConfirmStudentImportUseCase } from '@/application/use-cases/student/ConfirmStudentImportUseCase'

/**
 * PreviewStudentImportUseCase 팩토리 (Client-side)
 */
export function createPreviewStudentImportUseCase() {
  const supabase = createClient()
  const repository = new StudentImportRepository(supabase)
  return new PreviewStudentImportUseCase(repository)
}

/**
 * ConfirmStudentImportUseCase 팩토리 (Client-side)
 */
export function createConfirmStudentImportUseCase() {
  const supabase = createClient()
  const repository = new StudentImportRepository(supabase)
  return new ConfirmStudentImportUseCase(repository)
}
