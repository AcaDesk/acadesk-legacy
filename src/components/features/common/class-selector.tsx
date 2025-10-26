'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { Badge } from '@ui/badge'
import { getActiveClasses } from '@/app/actions/classes'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'

export interface ClassItem {
  id: string
  name: string
  subject: string | null
  active: boolean
}

interface ClassSelectorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** External classes list (if not provided, will fetch automatically) */
  classes?: ClassItem[]
  /** Only show active classes */
  onlyActive?: boolean
}

/**
 * ClassSelector Component
 *
 * 수업 선택 컴포넌트 - 과목별로 그룹화하여 표시
 *
 * ## 주요 기능
 * - 검색 가능한 드롭다운
 * - 과목별 그룹화 (수학, 영어, ...)
 * - 수업 상태 표시 (활성/비활성)
 *
 * ## 사용 예시
 *
 * ### 기본 사용
 * ```tsx
 * const [classId, setClassId] = useState<string>('')
 *
 * <ClassSelector
 *   value={classId}
 *   onChange={setClassId}
 * />
 * ```
 *
 * ### React Hook Form과 함께
 * ```tsx
 * <ClassSelector
 *   value={form.watch('classId')}
 *   onChange={(value) => form.setValue('classId', value)}
 *   placeholder="수업 선택"
 * />
 * ```
 */
export function ClassSelector({
  value,
  onChange,
  placeholder = '수업 선택',
  disabled = false,
  className,
  classes: externalClasses,
  onlyActive = true,
}: ClassSelectorProps) {
  const [open, setOpen] = useState(false)
  const [classes, setClasses] = useState<ClassItem[]>(externalClasses || [])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // If external classes provided, use them
    if (externalClasses) {
      setClasses(externalClasses)
      return
    }

    // Otherwise, fetch classes
    async function fetchClasses() {
      setLoading(true)
      try {
        const result = await getActiveClasses()
        if (result.success && result.data) {
          setClasses(result.data)
        } else {
          toast({
            title: '수업 로딩 실패',
            description: result.error || '수업 목록을 불러올 수 없습니다.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('[ClassSelector] Error fetching classes:', error)
        toast({
          title: '오류',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [externalClasses, toast])

  // Filter classes
  const filteredClasses = classes.filter((cls) => {
    if (onlyActive && !cls.active) return false
    return true
  })

  // Group classes by subject
  const groupedClasses = filteredClasses.reduce((acc, cls) => {
    const subject = cls.subject || '미분류'
    if (!acc[subject]) {
      acc[subject] = []
    }
    acc[subject].push(cls)
    return acc
  }, {} as Record<string, ClassItem[]>)

  // Get selected class name
  const selectedClass = classes.find((cls) => cls.id === value)
  const selectedLabel = selectedClass ? selectedClass.name : placeholder

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10 border border-input rounded-md px-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between', className)}
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="수업 검색..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            {Object.keys(groupedClasses).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                등록된 수업이 없습니다
              </div>
            ) : (
              Object.entries(groupedClasses).map(([subject, classList]) => (
                <CommandGroup key={subject} heading={subject}>
                  {classList.map((cls) => (
                    <CommandItem
                      key={cls.id}
                      value={cls.name}
                      onSelect={() => {
                        onChange?.(cls.id === value ? '' : cls.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === cls.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex-1">{cls.name}</span>
                      {cls.active ? (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">
                          비활성
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
