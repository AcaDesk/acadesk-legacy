'use server'

/**
 * 리포트 코멘트 AI 초안 생성
 *
 * 학생의 출석/과제/성적 지표를 Claude에 전달해 강사 코멘트 4개 필드
 * (총평/잘한 점/보완할 점/다음 목표) 초안을 생성한다.
 *
 * 원칙: 초안 모드 — 생성 결과는 강사가 검토·수정 후 저장/발송한다.
 * ANTHROPIC_API_KEY 미설정 시 기능은 비활성 상태로 안내 메시지를 반환한다.
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { withServerAction } from '@/lib/server-action-helpers'
import { env } from '@/lib/env'

const scoreSummarySchema = z.object({
  category: z.string().max(100),
  current: z.number().nullable(),
  previous: z.number().nullable(),
  change: z.number().nullable(),
  average: z.number().nullable(),
  retestRate: z.number().nullable(),
})

const aiCommentInputSchema = z.object({
  studentName: z.string().trim().min(1).max(50),
  grade: z.string().trim().max(30).optional(),
  period: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  attendance: z.object({
    total: z.number().int().min(0),
    present: z.number().int().min(0),
    late: z.number().int().min(0),
    absent: z.number().int().min(0),
    rate: z.number().min(0).max(100),
  }),
  homework: z.object({
    total: z.number().int().min(0),
    completed: z.number().int().min(0),
    rate: z.number().min(0).max(100),
  }),
  scores: z.array(scoreSummarySchema).max(20),
})

export type AiCommentInput = z.infer<typeof aiCommentInputSchema>

export interface AiCommentDraft {
  summary: string
  strengths: string
  improvements: string
  nextGoals: string
}

const FIELD_LIMITS: Record<keyof AiCommentDraft, number> = {
  summary: 500,
  strengths: 300,
  improvements: 300,
  nextGoals: 300,
}

const draftResponseSchema = z.object({
  summary: z.string(),
  strengths: z.string(),
  improvements: z.string(),
  nextGoals: z.string(),
})

const SYSTEM_PROMPT = `당신은 학원 강사의 학습 리포트 코멘트 작성을 돕는 어시스턴트입니다.
보호자에게 전달되는 리포트의 강사 코멘트 초안을 작성합니다.

규칙:
- 한국어 존댓말, 따뜻하고 전문적인 톤으로 작성합니다.
- 제공된 데이터에 근거해 구체적으로 서술하고, 데이터에 없는 내용을 지어내지 않습니다.
- 데이터가 없거나 0건인 항목(예: 성적 데이터 없음)은 언급을 생략하거나 "다음 기간에 함께 확인하겠습니다" 수준으로만 다룹니다.
- 점수·출석률 등 수치는 필요한 곳에만 자연스럽게 인용합니다.
- 과장된 칭찬이나 비난을 피하고, 보완할 점은 개선 방향과 함께 부드럽게 제시합니다.
- summary(총평)는 3~5문장, 500자 이내로 작성합니다.
- strengths(잘한 점), improvements(보완할 점), nextGoals(다음 목표)는 각각 1~3문장, 300자 이내로 작성합니다.`

/**
 * AI 코멘트 초안 생성 — 강사 검토를 전제로 한 초안만 반환하며 저장/발송은 하지 않는다.
 */
export async function generateAiCommentDraft(input: AiCommentInput) {
  return withServerAction<AiCommentDraft | null>(
    async () => {
      if (!env.ANTHROPIC_API_KEY) {
        throw new Error('AI 기능이 설정되지 않았습니다. 관리자에게 문의해주세요.')
      }

      const validated = aiCommentInputSchema.parse(input)

      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: '총평 (3~5문장, 500자 이내)' },
                strengths: { type: 'string', description: '잘한 점 (1~3문장, 300자 이내)' },
                improvements: { type: 'string', description: '보완할 점 (1~3문장, 300자 이내)' },
                nextGoals: { type: 'string', description: '다음 목표 (1~3문장, 300자 이내)' },
              },
              required: ['summary', 'strengths', 'improvements', 'nextGoals'],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: 'user',
            content: `다음 학생의 학습 데이터를 바탕으로 리포트 코멘트 초안을 작성해주세요.\n\n${JSON.stringify(
              {
                학생명: validated.studentName,
                학년: validated.grade || null,
                기간: `${validated.period.start} ~ ${validated.period.end}`,
                출석: validated.attendance,
                과제: validated.homework,
                과목별성적: validated.scores.map((s) => ({
                  과목: s.category,
                  이번기간평균: s.current,
                  이전기간평균: s.previous,
                  변화: s.change,
                  반평균: s.average,
                  재시험률: s.retestRate,
                })),
              },
              null,
              2
            )}`,
          },
        ],
      })

      if (response.stop_reason === 'refusal') {
        throw new Error('AI가 코멘트 생성을 완료하지 못했습니다. 다시 시도해주세요.')
      }

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('AI 응답이 비어 있습니다. 다시 시도해주세요.')
      }

      const parsed = draftResponseSchema.parse(JSON.parse(textBlock.text))

      // 필드별 최대 길이로 클램프 (CommentStep textarea maxLength와 일치)
      const clamp = (value: string, limit: number) => value.trim().slice(0, limit)

      return {
        summary: clamp(parsed.summary, FIELD_LIMITS.summary),
        strengths: clamp(parsed.strengths, FIELD_LIMITS.strengths),
        improvements: clamp(parsed.improvements, FIELD_LIMITS.improvements),
        nextGoals: clamp(parsed.nextGoals, FIELD_LIMITS.nextGoals),
      }
    },
    { actionName: 'generateAiCommentDraft', defaultValue: null }
  )
}

/**
 * AI 코멘트 기능 사용 가능 여부 — 클라이언트에서 버튼 노출 판단용
 */
export async function isAiCommentAvailable() {
  return withServerAction<boolean, boolean>(
    async () => Boolean(env.ANTHROPIC_API_KEY),
    { actionName: 'isAiCommentAvailable', defaultValue: false }
  )
}
