/**
 * Report Stepper Types & Constants
 *
 * 개별 리포트 생성 6단계 Stepper의 타입, 상수, Zod 스키마
 */

import { z } from 'zod'

// ============================================================================
// Step Definitions
// ============================================================================

export type ReportStepKey = 'student' | 'period' | 'data' | 'comment' | 'preview' | 'submit'

export interface StepDefinition {
  key: ReportStepKey
  label: string
  description: string
}

export const REPORT_STEPS: StepDefinition[] = [
  { key: 'student', label: '학생 선택', description: '리포트를 생성할 학생을 선택합니다' },
  { key: 'period', label: '유형/기간', description: '리포트 유형과 기간을 설정합니다' },
  { key: 'data', label: '데이터 확인', description: '수집된 학습 데이터를 확인합니다' },
  { key: 'comment', label: '코멘트 작성', description: '강사 코멘트를 작성합니다' },
  { key: 'preview', label: '미리보기', description: '보호자가 받을 리포트를 확인합니다' },
  { key: 'submit', label: '생성/전송', description: '리포트를 저장하고 전송합니다' },
]

export function getStepIndex(key: ReportStepKey): number {
  return REPORT_STEPS.findIndex((s) => s.key === key)
}

// ============================================================================
// Student Types
// ============================================================================

export interface SelectedStudent {
  id: string
  name: string
  studentCode: string
  grade: string | null
  classes: string[]
}

// ============================================================================
// Period Types
// ============================================================================

export interface PeriodConfig {
  type: 'weekly' | 'monthly'
  year?: number
  month?: number
  startDate?: string // YYYY-MM-DD
  endDate?: string   // YYYY-MM-DD
}

// ============================================================================
// Data Review Types
// ============================================================================

export interface DataWarning {
  type: 'no_attendance' | 'no_scores' | 'no_homework' | 'low_data'
  message: string
  severity: 'info' | 'warning'
  quickFixUrl?: string
}

// ============================================================================
// Comment Types
// ============================================================================

export interface CommentDraft {
  summary: string
  strengths: string
  improvements: string
  nextGoals: string
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const commentDraftSchema = z.object({
  summary: z.string().min(1, '총평을 입력해주세요'),
  strengths: z.string(),
  improvements: z.string(),
  nextGoals: z.string(),
})

// ============================================================================
// Recent Students (localStorage)
// ============================================================================

const RECENT_STUDENTS_KEY = 'acadesk-recent-report-students'
const MAX_RECENT = 5

export function getRecentStudents(): SelectedStudent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_STUDENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addRecentStudent(student: SelectedStudent): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentStudents().filter((s) => s.id !== student.id)
    const updated = [student, ...existing].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_STUDENTS_KEY, JSON.stringify(updated))
  } catch {
    // ignore localStorage errors
  }
}
