'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ui/command'
import { ScrollArea } from '@ui/scroll-area'
import { getStudents } from '@/app/actions/students'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { cn } from '@/lib/utils'

export interface Student {
  id: string
  student_code: string
  name: string
  grade?: string | null
  // Allow additional custom properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface StudentSearchBaseProps {
  /** External student list (if not provided, will fetch automatically) */
  students?: Student[]
  /** Whether to fetch students automatically (default: true if students not provided) */
  fetchStudents?: boolean
  /** Custom filter function */
  filter?: (student: Student) => boolean
  /** Placeholder text */
  placeholder?: string
  /** Empty state message */
  emptyMessage?: string
  /** Enable search functionality (default: true for multiple mode) */
  searchable?: boolean
  /** Show student code (default: true) */
  showStudentCode?: boolean
  /** Show grade (default: true) */
  showGrade?: boolean
  /** Custom badge renderer */
  renderBadge?: (student: Student) => React.ReactNode
  /** Loading state */
  loading?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Class name for container */
  className?: string
}

interface StudentSearchSingleProps extends StudentSearchBaseProps {
  mode: 'single'
  variant?: 'select' | 'list'
  /** Selected student ID (controlled) */
  value?: string
  /** Change handler */
  onChange?: (studentId: string | undefined) => void
  /** Allow clearing selection */
  clearable?: boolean
}

interface StudentSearchMultipleProps extends StudentSearchBaseProps {
  mode: 'multiple'
  variant?: 'checkbox-list'
  /** Selected student IDs (controlled) */
  value?: string[]
  /** Change handler */
  onChange?: (studentIds: string[]) => void
  /** Show select all checkbox (default: true) */
  showSelectAll?: boolean
  /** Show selected count badge (default: true) */
  showSelectedCount?: boolean
  /** Quick action buttons */
  quickActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: (students: Student[]) => void | Promise<void>
  }>
}

export type StudentSearchProps = StudentSearchSingleProps | StudentSearchMultipleProps

/**
 * StudentSearch Component
 *
 * A flexible, reusable student search and selection component.
 *
 * @example Single selection with dropdown
 * ```tsx
 * <StudentSearch
 *   mode="single"
 *   variant="select"
 *   value={selectedId}
 *   onChange={setSelectedId}
 *   placeholder="학생 선택"
 * />
 * ```
 *
 * @example Multiple selection with search
 * ```tsx
 * <StudentSearch
 *   mode="multiple"
 *   variant="checkbox-list"
 *   value={selectedIds}
 *   onChange={setSelectedIds}
 *   searchable={true}
 *   showSelectAll={true}
 * />
 * ```
 *
 * @example With custom filter and badge
 * ```tsx
 * <StudentSearch
 *   mode="multiple"
 *   filter={(student) => student.grade === "중1"}
 *   renderBadge={(student) =>
 *     student.isAssigned ? <Badge>기배정</Badge> : null
 *   }
 * />
 * ```
 */
export function StudentSearch(props: StudentSearchProps) {
  const {
    students: externalStudents,
    fetchStudents = !externalStudents,
    filter,
    placeholder = props.mode === 'single' ? '학생 선택' : '학생 검색...',
    emptyMessage = '등록된 학생이 없습니다',
    searchable = props.mode === 'multiple',
    showStudentCode = true,
    showGrade = true,
    renderBadge,
    loading: externalLoading,
    disabled = false,
    className,
  } = props

  const { toast } = useToast()
  const [internalStudents, setInternalStudents] = useState<Student[]>([])
  const [internalLoading, setInternalLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const students = externalStudents || internalStudents
  const loading = externalLoading || internalLoading

  const loadStudents = useCallback(async () => {
    try {
      setInternalLoading(true)
      const result = await getStudents()

      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록을 불러올 수 없습니다')
      }

      setInternalStudents(result.data)
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setInternalLoading(false)
    }
  }, [toast])

  // Fetch students if needed
  useEffect(() => {
    if (fetchStudents && !externalStudents) {
      loadStudents()
    }
  }, [fetchStudents, externalStudents, loadStudents])

  // Filter and search students
  const filteredStudents = useMemo(() => {
    let result = students

    // Apply custom filter
    if (filter) {
      result = result.filter(filter)
    }

    // Apply search
    if (searchable && searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(
        (student) =>
          student.name.toLowerCase().includes(search) ||
          student.student_code.toLowerCase().includes(search) ||
          (student.grade && student.grade.toLowerCase().includes(search))
      )
    }

    return result
  }, [students, filter, searchable, searchTerm])

  if (props.mode === 'single') {
    return (
      <StudentSearchSingle
        {...props}
        students={filteredStudents}
        loading={loading}
        disabled={disabled}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showStudentCode={showStudentCode}
        showGrade={showGrade}
        renderBadge={renderBadge}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        searchable={searchable}
        className={className}
      />
    )
  }

  return (
    <StudentSearchMultiple
      {...props}
      students={filteredStudents}
      loading={loading}
      disabled={disabled}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      showStudentCode={showStudentCode}
      showGrade={showGrade}
      renderBadge={renderBadge}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      searchable={searchable}
      className={className}
    />
  )
}

// Single selection variant
function StudentSearchSingle({
  variant = 'select',
  value,
  onChange,
  students,
  loading,
  disabled,
  clearable = false,
  showStudentCode,
  showGrade,
  placeholder,
  emptyMessage,
  className,
}: StudentSearchSingleProps & {
  students: Student[]
  loading: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
}) {
  const [open, setOpen] = useState(false)

  if (variant === 'select') {
    const selectedStudent = students.find((s) => s.id === value)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn('w-full justify-between font-normal', className)}
          >
            {loading ? (
              <span className="text-muted-foreground">로딩 중...</span>
            ) : selectedStudent ? (
              <span className="flex items-center gap-2">
                {selectedStudent.name}
                {showStudentCode && (
                  <span className="text-xs text-muted-foreground">
                    ({selectedStudent.student_code})
                  </span>
                )}
                {showGrade && selectedStudent.grade && (
                  <span className="text-xs text-muted-foreground">
                    {selectedStudent.grade}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          align="start"
        >
          <Command>
            <CommandInput placeholder="이름 또는 학번으로 검색..." />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {clearable && value && (
                  <CommandItem
                    value="__clear_selection__"
                    onSelect={() => {
                      onChange?.(undefined)
                      setOpen(false)
                    }}
                    className="text-muted-foreground"
                  >
                    선택 해제
                  </CommandItem>
                )}
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`${student.name} ${student.student_code}`}
                    onSelect={() => {
                      onChange?.(student.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === student.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span>{student.name}</span>
                    {showStudentCode && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({student.student_code})
                      </span>
                    )}
                    {showGrade && student.grade && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {student.grade}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // List variant (for future extension)
  return null
}

// Multiple selection variant
function StudentSearchMultiple({
  value = [],
  onChange,
  students,
  loading,
  disabled,
  searchTerm,
  onSearchChange,
  showStudentCode,
  showGrade,
  renderBadge,
  placeholder,
  emptyMessage,
  searchable,
  showSelectAll = true,
  showSelectedCount = true,
  quickActions,
  className,
}: StudentSearchMultipleProps & {
  students: Student[]
  loading: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
}) {
  const selectedSet = useMemo(() => new Set(value), [value])
  const allSelected = students.length > 0 && students.every((s) => selectedSet.has(s.id))

  const toggleStudent = (studentId: string) => {
    const newSet = new Set(selectedSet)
    if (newSet.has(studentId)) {
      newSet.delete(studentId)
    } else {
      newSet.add(studentId)
    }
    onChange?.(Array.from(newSet))
  }

  const toggleAll = () => {
    if (allSelected) {
      onChange?.([])
    } else {
      onChange?.(students.map((s) => s.id))
    }
  }

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleQuickAction = async (action: NonNullable<typeof quickActions>[number]) => {
    try {
      setActionLoading(action.label)
      await action.onClick(students)
    } catch (error) {
      console.error('Quick action error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  // Check if className contains 'h-full' to determine if we should use flexible height
  const useFlexibleHeight = className?.includes('h-full')

  return (
    <div className={`${className || ''} ${useFlexibleHeight ? 'flex flex-col' : ''}`}>
      {/* Header with quick actions */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        {quickActions?.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action)}
            disabled={disabled || actionLoading !== null}
          >
            {actionLoading === action.label ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </Button>
        ))}
        {showSelectAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            disabled={disabled || loading || students.length === 0}
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </Button>
        )}
        {showSelectedCount && (
          <div className="ml-auto">
            <Badge variant="secondary">{value.length}명 선택됨</Badge>
          </div>
        )}
      </div>

      {/* Search */}
      {searchable && (
        <div className="relative mb-4 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={disabled || loading}
            className="pl-10"
          />
        </div>
      )}

      {/* Student List */}
      <ScrollArea className={`border rounded-lg ${useFlexibleHeight ? 'flex-1 min-h-0' : 'max-h-96'}`}>
        <div className={useFlexibleHeight ? 'h-[500px]' : ''}>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>로딩 중...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? '검색 결과가 없습니다.' : emptyMessage}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {/* Select All in list */}
              {showSelectAll && (
                <div className="flex items-center space-x-2 pb-2 border-b mb-2">
                  <Checkbox
                    id="select-all-checkbox"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor="select-all-checkbox"
                    className="cursor-pointer font-medium"
                  >
                    전체 선택
                  </Label>
                </div>
              )}

              {students.map((student) => {
                const isSelected = selectedSet.has(student.id)
                return (
                  <div
                    key={student.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleStudent(student.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleStudent(student.id)
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleStudent(student.id)}
                        disabled={disabled}
                      />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {showStudentCode && (
                            <span>{student.student_code}</span>
                          )}
                          {showGrade && student.grade && (
                            <>
                              <span>·</span>
                              <span>{student.grade}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderBadge?.(student)}
                      {isSelected && (
                        <Badge variant="secondary" className="text-[11px]">
                          선택됨
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
