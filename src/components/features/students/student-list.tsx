'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Calendar } from '@ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover'
import { Calendar as CalendarIcon, X, UserX } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { StudentTableImproved, Student } from './student-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import { deleteStudent } from '@/app/actions/students'
import { useStudentsEnrichedQuery } from '@/hooks/queries/use-students-query'
import { queryKeys } from '@/lib/query-keys'
import type { StudentListEnriched } from '@/app/actions/students/queries'

type BadgeFilter =
  | 'overdue'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'attendance_issue'
  | 'new_student'
  | 'birthday_today'
  | 'birthday_soon'
  | 'no_guardian'
  | null

function toTableStudent(s: StudentListEnriched): Student {
  return {
    id: s.id,
    student_code: s.student_code,
    grade: s.grade,
    school: s.school,
    enrollment_date: s.enrollment_date ?? '',
    birth_date: s.birth_date,
    gender: null,
    student_phone: s.student_phone,
    profile_image_url: s.profile_image_url,
    users: {
      name: s.name,
      email: s.email,
      phone: s.phone,
    },
    class_enrollments: s.classes.map((c) => ({
      classes: { name: c.name || '' },
    })),
    recentAttendance: s.recentAttendance,
    invoices: s.invoices,
    guardians: s.guardians.map((g) => ({
      id: g.id ?? undefined,
      name: g.name ?? undefined,
      phone: g.phone,
    })),
  } as Student
}

export function StudentList() {
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedSchool, setSelectedSchool] = useState<string>('all')
  const [selectedCommuteMethod, setSelectedCommuteMethod] = useState<string>('all')
  const [selectedMarketingSource, setSelectedMarketingSource] = useState<string>('all')
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState<Date | undefined>()
  const [enrollmentDateTo, setEnrollmentDateTo] = useState<Date | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: allStudents, isFetching, isError } = useStudentsEnrichedQuery()

  // 필터 옵션은 로드된 데이터에서 직접 추출
  const { grades, schools, classes } = useMemo(() => {
    const data = allStudents || []
    const gradeSet = new Set<string>()
    const schoolSet = new Set<string>()
    const classMap = new Map<string, string>()
    for (const s of data) {
      if (s.grade) gradeSet.add(s.grade)
      if (s.school) schoolSet.add(s.school)
      for (const c of s.classes) {
        if (c.id && c.name) classMap.set(c.id, c.name)
      }
    }
    return {
      grades: Array.from(gradeSet).sort(),
      schools: Array.from(schoolSet).sort(),
      classes: Array.from(classMap, ([id, name]) => ({ id, name })).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }
  }, [allStudents])

  // 검색·필터를 모두 메모리에서 즉시 적용
  const filteredStudents = useMemo(() => {
    const data = allStudents || []
    const term = searchInput.trim().toLowerCase()
    const fromDate = enrollmentDateFrom
      ? format(enrollmentDateFrom, 'yyyy-MM-dd')
      : null
    const toDate = enrollmentDateTo ? format(enrollmentDateTo, 'yyyy-MM-dd') : null

    return data.filter((s) => {
      if (selectedGrade !== 'all' && s.grade !== selectedGrade) return false
      if (selectedSchool !== 'all' && s.school !== selectedSchool) return false
      if (selectedCommuteMethod !== 'all' && s.commute_method !== selectedCommuteMethod)
        return false
      if (
        selectedMarketingSource !== 'all' &&
        s.marketing_source !== selectedMarketingSource
      )
        return false
      if (selectedClass !== 'all') {
        const inClass = s.classes.some((c) => c.id === selectedClass)
        if (!inClass) return false
      }
      if (fromDate && (!s.enrollment_date || s.enrollment_date < fromDate)) return false
      if (toDate && (!s.enrollment_date || s.enrollment_date > toDate)) return false

      if (term) {
        const haystack = [
          s.name,
          s.student_code,
          s.email ?? '',
          s.phone ?? '',
          s.student_phone ?? '',
          s.grade ?? '',
          s.school ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }

      return true
    })
  }, [
    allStudents,
    selectedGrade,
    selectedClass,
    selectedSchool,
    selectedCommuteMethod,
    selectedMarketingSource,
    enrollmentDateFrom,
    enrollmentDateTo,
    searchInput,
  ])

  const totalCount = filteredStudents.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // 필터로 행 수가 줄어 currentPage가 범위를 벗어나면 보정
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize).map(toTableStudent)
  }, [filteredStudents, currentPage, pageSize])

  function handleFilterChange(setter: (val: string) => void, val: string) {
    setter(val)
    setCurrentPage(1)
  }

  async function handleDelete(studentId: string, studentName: string) {
    try {
      const result = await deleteStudent(studentId)
      if (!result.success) throw new Error(result.error || 'Failed to delete student')

      toast({
        title: '학생 삭제 완료',
        description: `${studentName} 학생이 성공적으로 삭제되었습니다.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all() })
    } catch (error) {
      console.error('[StudentList] Failed to delete student:', error)
      toast({
        title: '학생 삭제 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  function clearFilters() {
    setSelectedGrade('all')
    setSelectedClass('all')
    setSelectedSchool('all')
    setSelectedCommuteMethod('all')
    setSelectedMarketingSource('all')
    setEnrollmentDateFrom(undefined)
    setEnrollmentDateTo(undefined)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (isError) {
      toast({
        title: '학생 목록 로드 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }, [isError, toast])

  const noGuardianCount = (allStudents || []).filter(
    (s) => !s.guardians || s.guardians.length === 0
  ).length

  return (
    <div className="space-y-4">
      {/* 보호자 미연결 알림 배너 */}
      {!isFetching && noGuardianCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
            <UserX className="h-4 w-4 flex-shrink-0" />
            <span>
              보호자가 연결되지 않은 학생이 <strong>{noGuardianCount}명</strong> 있습니다.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-yellow-400 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
            onClick={() => setBadgeFilter(badgeFilter === 'no_guardian' ? null : 'no_guardian')}
          >
            {badgeFilter === 'no_guardian' ? '필터 해제' : '보기'}
          </Button>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">학년</label>
          <Select
            value={selectedGrade}
            onValueChange={(v) => handleFilterChange(setSelectedGrade, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="학년 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">수업</label>
          <Select
            value={selectedClass}
            onValueChange={(v) => handleFilterChange(setSelectedClass, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="수업 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">학교</label>
          <Select
            value={selectedSchool}
            onValueChange={(v) => handleFilterChange(setSelectedSchool, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="학교 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">통학 방법</label>
          <Select
            value={selectedCommuteMethod}
            onValueChange={(v) => handleFilterChange(setSelectedCommuteMethod, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="통학 방법" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="도보">도보</SelectItem>
              <SelectItem value="자전거">자전거</SelectItem>
              <SelectItem value="대중교통">대중교통</SelectItem>
              <SelectItem value="자가용">자가용</SelectItem>
              <SelectItem value="학원버스">학원버스</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">유입 경로</label>
          <Select
            value={selectedMarketingSource}
            onValueChange={(v) => handleFilterChange(setSelectedMarketingSource, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="유입 경로" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="지인추천">지인 추천</SelectItem>
              <SelectItem value="온라인광고">온라인 광고</SelectItem>
              <SelectItem value="현수막/전단지">현수막/전단지</SelectItem>
              <SelectItem value="검색">검색</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">등록일 (시작)</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {enrollmentDateFrom
                  ? format(enrollmentDateFrom, 'PPP', { locale: ko })
                  : '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={enrollmentDateFrom}
                onSelect={(d) => {
                  setEnrollmentDateFrom(d)
                  setCurrentPage(1)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">등록일 (종료)</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {enrollmentDateTo
                  ? format(enrollmentDateTo, 'PPP', { locale: ko })
                  : '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={enrollmentDateTo}
                onSelect={(d) => {
                  setEnrollmentDateTo(d)
                  setCurrentPage(1)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium opacity-0">Clear</label>
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* 학생 테이블 */}
      <StudentTableImproved
        data={pageStudents}
        loading={isFetching}
        onDelete={handleDelete}
        badgeFilter={badgeFilter}
        onBadgeFilterChange={setBadgeFilter}
        searchValue={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value)
          setCurrentPage(1)
        }}
        totalCount={totalCount}
        totalCountExact={true}
        hasNextPage={currentPage < totalPages}
        searchBusy={false}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          setCurrentPage(1)
        }}
        manualPagination
      />
    </div>
  )
}
