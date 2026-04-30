import type {
  BatchActionType,
  BatchOptions,
  CommentOptions,
  ReportOptions,
  SendOptions,
  TargetReportMode,
  TargetReportLookupOptions,
} from '@/core/types/batch.types'

const DEFAULT_REPORT_SECTIONS: NonNullable<ReportOptions['includedSections']> = [
  'attendance',
  'grades',
  'homework',
  'comment',
]

function isValidYear(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2000 && value <= 2100
}

function isValidMonth(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentWeekRange(now: Date) {
  const day = now.getDay()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  }
}

function getCurrentPeriod(now: Date) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

function normalizeTargetLookup<T extends TargetReportLookupOptions>(
  value: Partial<T> | undefined,
  now: Date
) {
  const { year, month } = getCurrentPeriod(now)
  const weeklyRange = getCurrentWeekRange(now)
  const targetReportMode: TargetReportMode =
    value?.targetReportMode === 'monthly' || value?.targetReportMode === 'weekly'
      ? value.targetReportMode
      : 'latest'

  return {
    targetReportMode,
    reportYear:
      targetReportMode === 'monthly'
        ? (isValidYear(value?.reportYear) ? value.reportYear : year)
        : value?.reportYear,
    reportMonth:
      targetReportMode === 'monthly'
        ? (isValidMonth(value?.reportMonth) ? value.reportMonth : month)
        : value?.reportMonth,
    reportStartDate:
      targetReportMode === 'weekly'
        ? (isNonEmptyString(value?.reportStartDate) ? value.reportStartDate : weeklyRange.start)
        : value?.reportStartDate,
    reportEndDate:
      targetReportMode === 'weekly'
        ? (isNonEmptyString(value?.reportEndDate) ? value.reportEndDate : weeklyRange.end)
        : value?.reportEndDate,
  }
}

export function normalizeReportOptions(
  value: Partial<ReportOptions> | undefined,
  now: Date = new Date()
): ReportOptions {
  const { year, month } = getCurrentPeriod(now)
  const weeklyRange = getCurrentWeekRange(now)
  const reportType = value?.reportType === 'weekly' ? 'weekly' : 'monthly'

  return {
    reportType,
    year: isValidYear(value?.year) ? value.year : year,
    month: isValidMonth(value?.month) ? value.month : month,
    weekStartDate:
      reportType === 'weekly'
        ? (isNonEmptyString(value?.weekStartDate) ? value.weekStartDate : weeklyRange.start)
        : value?.weekStartDate,
    weekEndDate:
      reportType === 'weekly'
        ? (isNonEmptyString(value?.weekEndDate) ? value.weekEndDate : weeklyRange.end)
        : value?.weekEndDate,
    templateId: value?.templateId,
    includedSections:
      Array.isArray(value?.includedSections) && value.includedSections.length > 0
        ? value.includedSections
        : [...DEFAULT_REPORT_SECTIONS],
  }
}

export function normalizeCommentOptions(
  value: Partial<CommentOptions> | undefined,
  now: Date = new Date()
): CommentOptions {
  return {
    overwriteExisting: value?.overwriteExisting ?? false,
    ...normalizeTargetLookup<CommentOptions>(value, now),
    commentTemplateId: value?.commentTemplateId,
  }
}

export function normalizeSendOptions(
  value: Partial<SendOptions> | undefined,
  now: Date = new Date()
): SendOptions {
  return {
    channel: value?.channel ?? 'sms',
    ...normalizeTargetLookup<SendOptions>(value, now),
    subject: value?.subject,
    messageBody: value?.messageBody,
    messageTemplateId: value?.messageTemplateId,
    kakaoTemplateId: value?.kakaoTemplateId,
  }
}

export function normalizeBatchOptions(
  actionType: BatchActionType | null | undefined,
  value: BatchOptions | undefined,
  now: Date = new Date()
): BatchOptions {
  if (actionType === 'report') {
    return normalizeReportOptions(value as Partial<ReportOptions> | undefined, now)
  }

  if (actionType === 'comment') {
    return normalizeCommentOptions(value as Partial<CommentOptions> | undefined, now)
  }

  if (actionType === 'send') {
    return normalizeSendOptions(value as Partial<SendOptions> | undefined, now)
  }

  return (value ?? {}) as Record<string, never>
}
