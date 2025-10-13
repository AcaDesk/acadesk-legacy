// Subject Types

export interface Subject {
  id: string
  tenant_id: string
  name: string
  description: string | null
  code: string | null
  color: string
  sort_order: number
  active: boolean
  meta: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface SubjectStatistics extends Subject {
  class_count: number
}

// 기본 과목 색상 팔레트
export const DEFAULT_SUBJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
]
