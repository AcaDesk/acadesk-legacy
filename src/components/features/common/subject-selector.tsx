'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { getSubjectsWithStatistics, type Subject } from '@/app/actions/subjects'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'

interface SubjectSelectorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** External subjects list (if not provided, will fetch automatically) */
  subjects?: Subject[]
  /** Show color indicator */
  showColor?: boolean
  /** Only show active subjects */
  onlyActive?: boolean
}

/**
 * SubjectSelector Component
 *
 * 과목 선택 컴포넌트 - DB에서 과목 목록을 불러와 표시
 * 각 과목의 대표 색상을 함께 표시하여 시각적 일관성 제공
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [subject, setSubject] = useState<string>('')
 *
 * <SubjectSelector
 *   value={subject}
 *   onChange={setSubject}
 *   showColor={true}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <SubjectSelector
 *   value={form.watch('subject')}
 *   onChange={(value) => form.setValue('subject', value)}
 *   placeholder="과목 선택"
 *   showColor={true}
 * />
 * ```
 *
 * ### 외부에서 데이터 제공
 * ```tsx
 * const { data: subjects } = await getSubjectsWithStatistics()
 *
 * <SubjectSelector
 *   subjects={subjects}
 *   value={subject}
 *   onChange={setSubject}
 * />
 * ```
 */
export function SubjectSelector({
  value,
  onChange,
  placeholder = '과목 선택',
  disabled = false,
  className,
  subjects: externalSubjects,
  showColor = true,
  onlyActive = true,
}: SubjectSelectorProps) {
  const [subjects, setSubjects] = useState<Subject[]>(externalSubjects || [])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // If external subjects provided, use them
    if (externalSubjects) {
      setSubjects(externalSubjects)
      return
    }

    // Otherwise, fetch subjects
    async function fetchSubjects() {
      setLoading(true)
      try {
        const result = await getSubjectsWithStatistics()
        if (result.success && result.data) {
          setSubjects(result.data)
        } else {
          toast({
            title: '과목 로딩 실패',
            description: result.error || '과목 목록을 불러올 수 없습니다.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('[SubjectSelector] Error fetching subjects:', error)
        toast({
          title: '오류',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [externalSubjects, toast])

  // Filter subjects
  const filteredSubjects = subjects.filter((subject) => {
    if (onlyActive && !subject.active) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10 border border-input rounded-md px-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredSubjects.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            등록된 과목이 없습니다
          </div>
        ) : (
          filteredSubjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.name}>
              <div className="flex items-center gap-2">
                {showColor && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                )}
                <span>{subject.name}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
