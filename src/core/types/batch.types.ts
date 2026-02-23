/**
 * Batch Workbench Types
 * 일괄작업 센터 관련 타입 정의
 */

// =============================================================================
// Enums / Literal Unions
// =============================================================================

export type BatchActionType = 'report' | 'comment' | 'send'

export type BatchDraftStatus = 'draft' | 'ready' | 'running' | 'archived'

export type BatchDraftStep = 'targets' | 'action' | 'options' | 'review' | 'run'

export type JobStatus = 'queued' | 'running' | 'partial_failed' | 'succeeded' | 'failed' | 'canceled'

export type JobItemStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

// =============================================================================
// Database Records
// =============================================================================

export interface BatchDraft {
  id: string
  tenant_id: string
  status: BatchDraftStatus
  step: BatchDraftStep
  action_type: BatchActionType | null
  target_ids: string[]
  target_snapshot_count: number
  options: BatchOptions
  schedule: BatchSchedule
  validation: BatchValidationItem[]
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface BatchJob {
  id: string
  tenant_id: string
  draft_id: string | null
  action_type: BatchActionType
  job_name: string | null
  job_params: Record<string, unknown>
  status: JobStatus
  progress: BatchJobProgress
  idempotency_key: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_template: boolean
  template_name: string | null
}

export interface BatchJobItem {
  id: string
  tenant_id: string
  job_id: string
  target_id: string
  target_name: string | null
  status: JobItemStatus
  result_data: Record<string, unknown> | null
  error_message: string | null
  error_category: string | null
  retryable: boolean
  retry_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// =============================================================================
// Progress & Validation
// =============================================================================

export interface BatchJobProgress {
  total: number
  processed: number
  success: number
  failed: number
}

export interface BatchSchedule {
  mode: 'now' | 'scheduled'
  scheduledAt?: string
}

export interface BatchValidationItem {
  level: 'error' | 'warning' | 'info'
  code: string
  message: string
  blocking: boolean
}

// =============================================================================
// Batch Options (discriminated union by action_type)
// =============================================================================

export type BatchOptions = ReportOptions | CommentOptions | SendOptions | Record<string, never>

export interface ReportOptions {
  reportType: string
  year: number
  month: number
  templateId?: string
  includedSections?: string[]
}

export interface CommentOptions {
  commentTemplateId?: string
  overwriteExisting: boolean
}

export interface SendOptions {
  channel: 'sms' | 'lms' | 'kakao'
  subject?: string
  messageBody?: string
  messageTemplateId?: string
}

// =============================================================================
// Target
// =============================================================================

export interface BatchTarget {
  id: string
  name: string
  student_code: string | null
  grade: string | null
  class_name: string | null
  class_id: string | null
}

// =============================================================================
// Server Action Payloads
// =============================================================================

export interface CreateBatchDraftPayload {
  targetIds?: string[]
  actionType?: BatchActionType
}

export interface PatchBatchDraftPayload {
  step?: BatchDraftStep
  action_type?: BatchActionType | null
  target_ids?: string[]
  target_snapshot_count?: number
  options?: BatchOptions
  schedule?: BatchSchedule
  status?: BatchDraftStatus
}

export interface ReviewBatchDraftResult {
  impactSummary: {
    totalTargets: number
    estimatedCreations: number
    estimatedUpdates: number
    estimatedSends: number
  }
  samples: BatchTarget[]
  risks: BatchValidationItem[]
}

export interface ExecuteBatchDraftPayload {
  draftId: string
  idempotencyKey: string
}

export interface BatchJobsFilter {
  actionType?: BatchActionType
  status?: JobStatus
  createdBy?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

// =============================================================================
// Wizard UI State
// =============================================================================

export const BATCH_STEPS: { key: BatchDraftStep; label: string; description: string }[] = [
  { key: 'targets', label: '대상 선택', description: '작업 대상 학생을 선택합니다' },
  { key: 'action', label: '작업 선택', description: '수행할 작업을 선택합니다' },
  { key: 'options', label: '옵션 설정', description: '작업 세부 옵션을 설정합니다' },
  { key: 'review', label: '검토', description: '작업 내용을 최종 확인합니다' },
  { key: 'run', label: '실행', description: '작업을 실행하고 결과를 확인합니다' },
]

export const STEP_ORDER: BatchDraftStep[] = ['targets', 'action', 'options', 'review', 'run']

export function getStepIndex(step: BatchDraftStep): number {
  return STEP_ORDER.indexOf(step)
}

export function isStepAccessible(currentStep: BatchDraftStep, targetStep: BatchDraftStep): boolean {
  return getStepIndex(targetStep) <= getStepIndex(currentStep)
}
