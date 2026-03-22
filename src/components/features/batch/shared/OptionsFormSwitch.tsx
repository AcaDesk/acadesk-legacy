'use client'

import { ReportOptionsForm } from '../option-forms/ReportOptionsForm'
import { CommentOptionsForm } from '../option-forms/CommentOptionsForm'
import { SendOptionsForm } from '../option-forms/SendOptionsForm'
import type {
  BatchActionType,
  BatchOptions,
  CommentOptions,
  ReportOptions,
  SendOptions,
} from '@/core/types/batch.types'
import {
  normalizeCommentOptions,
  normalizeReportOptions,
  normalizeSendOptions,
} from '@/lib/batch-options'

interface OptionsFormSwitchProps {
  actionType: BatchActionType
  value: BatchOptions
  onChange: (value: BatchOptions) => void
}

export function OptionsFormSwitch({ actionType, value, onChange }: OptionsFormSwitchProps) {
  switch (actionType) {
    case 'report':
      return (
        <ReportOptionsForm
          value={normalizeReportOptions(value as Partial<ReportOptions>)}
          onChange={onChange}
        />
      )
    case 'comment':
      return (
        <CommentOptionsForm
          value={normalizeCommentOptions(value as Partial<CommentOptions>)}
          onChange={onChange}
        />
      )
    case 'send':
      return (
        <SendOptionsForm
          value={normalizeSendOptions(value as Partial<SendOptions>)}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}
