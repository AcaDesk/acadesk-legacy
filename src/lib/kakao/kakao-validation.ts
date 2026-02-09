/**
 * Kakao Alimtalk Validation Schemas
 *
 * 카카오 알림톡 관련 Zod 스키마
 * - 서버/클라이언트 공용 사용
 */

import { z } from 'zod'

// ============================================================================
// Button Schema
// ============================================================================

export const kakaoButtonSchema = z.object({
  buttonType: z.enum(['WL', 'AL', 'BK', 'MD', 'DS', 'BC', 'BT', 'AC']),
  buttonName: z.string().min(1).max(14),
  linkMo: z.string().optional(),
  linkPc: z.string().optional(),
  linkAnd: z.string().optional(),
  linkIos: z.string().optional(),
})

export type KakaoButton = z.infer<typeof kakaoButtonSchema>

// ============================================================================
// Template Schemas
// ============================================================================

export const kakaoTemplateSchema = z.object({
  name: z.string().min(1, '템플릿 이름을 입력해주세요.').max(150),
  content: z.string().min(1, '템플릿 내용을 입력해주세요.').max(1000),
  categoryCode: z.string().min(1, '카테고리를 선택해주세요.'),
  messageType: z.enum(['BA', 'EX', 'AD', 'MI']).default('BA'),
  emphasizeType: z.enum(['NONE', 'TEXT']).default('NONE'),
  emphasizeTitle: z.string().max(23).optional(),
  emphasizeSubtitle: z.string().max(23).optional(),
  buttons: z.array(kakaoButtonSchema).max(5).optional(),
  extraContent: z.string().max(500).optional(),
  adContent: z.string().max(500).optional(),
  securityFlag: z.boolean().default(false),
})

export const kakaoTemplateUpdateSchema = kakaoTemplateSchema.partial()

export type KakaoTemplateInput = z.infer<typeof kakaoTemplateSchema>
export type KakaoTemplateUpdateInput = z.infer<typeof kakaoTemplateUpdateSchema>

// ============================================================================
// Template Form Schema (Client-side with additional validations)
// ============================================================================

export const kakaoTemplateFormSchema = kakaoTemplateSchema.refine(
  (data) => {
    // TEXT 강조 유형일 때 제목/부제목 필수
    if (data.emphasizeType === 'TEXT') {
      return !!data.emphasizeTitle?.trim() && !!data.emphasizeSubtitle?.trim()
    }
    return true
  },
  {
    message: '텍스트 강조 유형을 선택한 경우 강조 제목과 부제목을 입력해주세요.',
    path: ['emphasizeTitle'],
  }
)

export type KakaoTemplateFormInput = z.infer<typeof kakaoTemplateFormSchema>
