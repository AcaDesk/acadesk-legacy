'use client'

import { ReportOptionsForm } from '../option-forms/ReportOptionsForm'
import { CommentOptionsForm } from '../option-forms/CommentOptionsForm'
import { SendOptionsForm } from '../option-forms/SendOptionsForm'
import type {
  BatchActionType,
  BatchOptions,
  ReportOptions,
  CommentOptions,
  SendOptions,
} from '@/core/types/batch.types'

interface OptionsFormSwitchProps {
  actionType: BatchActionType
  value: BatchOptions
  onChange: (value: BatchOptions) => void
}

const DEFAULT_REPORT: ReportOptions = {
  reportType: 'monthly',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  includedSections: ['attendance', 'grades', 'homework', 'comment'],
}

const DEFAULT_COMMENT: CommentOptions = {
  overwriteExisting: false,
}

const DEFAULT_SEND: SendOptions = {
  channel: 'sms',
}

export function OptionsFormSwitch({ actionType, value, onChange }: OptionsFormSwitchProps) {
  switch (actionType) {
    case 'report':
      return (
        <ReportOptionsForm
          value={{ ...DEFAULT_REPORT, ...(value as Partial<ReportOptions>) }}
          onChange={onChange}
        />
      )
    case 'comment':
      return (
        <CommentOptionsForm
          value={{ ...DEFAULT_COMMENT, ...(value as Partial<CommentOptions>) }}
          onChange={onChange}
        />
      )
    case 'send':
      return (
        <SendOptionsForm
          value={{ ...DEFAULT_SEND, ...(value as Partial<SendOptions>) }}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}
