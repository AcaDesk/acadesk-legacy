import { describe, expect, it } from 'vitest'
import {
  normalizeBatchOptions,
  normalizeCommentOptions,
  normalizeReportOptions,
  normalizeSendOptions,
} from '@/lib/batch-options'

describe('batch option normalization', () => {
  const fixedNow = new Date('2026-03-08T10:00:00+09:00')

  it('fills monthly report defaults when draft options are empty', () => {
    expect(normalizeBatchOptions('report', {}, fixedNow)).toEqual({
      reportType: 'monthly',
      year: 2026,
      month: 3,
      weekStartDate: undefined,
      weekEndDate: undefined,
      templateId: undefined,
      includedSections: ['attendance', 'grades', 'homework', 'comment'],
    })
  })

  it('fills weekly report dates when missing', () => {
    expect(normalizeReportOptions({ reportType: 'weekly' }, fixedNow)).toEqual({
      reportType: 'weekly',
      year: 2026,
      month: 3,
      weekStartDate: '2026-03-02',
      weekEndDate: '2026-03-08',
      templateId: undefined,
      includedSections: ['attendance', 'grades', 'homework', 'comment'],
    })
  })

  it('fills monthly target lookup defaults for comment jobs', () => {
    expect(normalizeCommentOptions({ targetReportMode: 'monthly' }, fixedNow)).toEqual({
      overwriteExisting: false,
      targetReportMode: 'monthly',
      reportYear: 2026,
      reportMonth: 3,
      reportStartDate: undefined,
      reportEndDate: undefined,
      commentTemplateId: undefined,
    })
  })

  it('fills send defaults for latest mode', () => {
    expect(normalizeSendOptions({}, fixedNow)).toEqual({
      channel: 'sms',
      targetReportMode: 'latest',
      reportYear: undefined,
      reportMonth: undefined,
      reportStartDate: undefined,
      reportEndDate: undefined,
      subject: undefined,
      messageBody: undefined,
      messageTemplateId: undefined,
    })
  })
})
