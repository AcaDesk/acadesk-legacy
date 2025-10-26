'use client'

import { GRADES } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'

interface GradeSelectorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * GradeSelector Component
 *
 * 학년 선택 컴포넌트 - constants.ts의 GRADES를 기반으로 일관된 UI 제공
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [grade, setGrade] = useState<string>('')
 *
 * <GradeSelector
 *   value={grade}
 *   onChange={setGrade}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <GradeSelector
 *   value={form.watch('grade')}
 *   onChange={(value) => form.setValue('grade', value)}
 *   placeholder="학년 선택"
 * />
 * ```
 */
export function GradeSelector({
  value,
  onChange,
  placeholder = '학년 선택',
  disabled = false,
  className,
}: GradeSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {GRADES.map((grade) => (
          <SelectItem key={grade.value} value={grade.value}>
            {grade.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
