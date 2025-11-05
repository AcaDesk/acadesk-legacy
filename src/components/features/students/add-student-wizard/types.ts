import * as z from 'zod'
import { GUARDIAN_MODES } from '@/lib/constants'

// ============================================================================
// Schemas
// ============================================================================

export const guardianSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  relationship: z.string().min(1, '관계를 선택해주세요'),
  address: z.string().optional(),
  occupation: z.string().optional(),
})

export const studentWizardSchema = z.object({
  // Step 1: 필수 정보
  name: z.string().min(1, '학생 이름을 입력해주세요'),
  birthDate: z.date().optional(),
  grade: z.string().min(1, '학년을 선택해주세요'),
  school: z.string().min(1, '학교를 입력하거나 선택해주세요'),
  gender: z.enum(['male', 'female', 'other']).optional(),

  // Step 2: 학부모 정보
  guardianMode: z.enum([GUARDIAN_MODES.NEW, GUARDIAN_MODES.EXISTING, GUARDIAN_MODES.SKIP]),
  guardian: guardianSchema.optional(),
  existingGuardianId: z.string().optional(),

  // Step 3: 추가 정보
  studentPhone: z.string().optional(),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  enrollmentDate: z.date().optional(),
  notes: z.string().optional(),
  commuteMethod: z.string().optional(),
  marketingSource: z.string().optional(),
  kioskPin: z.string()
    .regex(/^\d{4}$/, '4자리 숫자를 입력해주세요')
    .optional()
    .or(z.literal('')),
  profileImage: z.string().optional(),
})
  .refine(
    (data) => {
      // ✨ SKIP 모드일 때는 검증 우회
      if (data.guardianMode === GUARDIAN_MODES.SKIP) {
        return true
      }
      if (data.guardianMode === GUARDIAN_MODES.NEW) {
        // guardian 객체가 존재하고 유효한지 확인
        return data.guardian && guardianSchema.safeParse(data.guardian).success
      }
      return true
    },
    {
      message: '신규 학부모 정보를 올바르게 입력해주세요',
      path: ['guardian'],
    }
  )
  .refine(
    (data) => {
      // ✨ SKIP 모드일 때는 검증 우회
      if (data.guardianMode === GUARDIAN_MODES.SKIP) {
        return true
      }
      if (data.guardianMode === GUARDIAN_MODES.EXISTING) {
        return !!data.existingGuardianId
      }
      return true
    },
    {
      message: '기존 학부모를 목록에서 선택해주세요',
      path: ['existingGuardianId'],
    }
  )

// ============================================================================
// Types
// ============================================================================

export type StudentWizardFormValues = z.infer<typeof studentWizardSchema>

export interface Guardian {
  id: string
  name: string
  phone: string
  email?: string | null
  relationship?: string | null
}

export interface StepInfo {
  label: string
  description: string
}
