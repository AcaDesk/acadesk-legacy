'use client'

import { Label } from '@ui/label'
import { RadioGroup, RadioGroupItem } from '@ui/radio-group'
import type { CommentOptions } from '@/core/types/batch.types'

interface CommentOptionsFormProps {
  value: CommentOptions
  onChange: (value: CommentOptions) => void
}

export function CommentOptionsForm({ value, onChange }: CommentOptionsFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">기존 코멘트 처리</Label>
        <RadioGroup
          value={value.overwriteExisting ? 'overwrite' : 'skip'}
          onValueChange={(v) =>
            onChange({ ...value, overwriteExisting: v === 'overwrite' })
          }
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="skip" id="comment-skip" />
            <Label htmlFor="comment-skip" className="text-sm">
              기존 코멘트가 있으면 건너뛰기
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="overwrite" id="comment-overwrite" />
            <Label htmlFor="comment-overwrite" className="text-sm">
              기존 코멘트 덮어쓰기
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
