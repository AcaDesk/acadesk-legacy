'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Calendar } from '@ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { StudentTableImproved, Student } from './student-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import { getStudents, getStudentFilterOptions, deleteStudent } from '@/app/actions/students'

export function StudentList() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedGrade, setSelectedGrade] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedSchool, setSelectedSchool] = useState<string>('all')
  const [selectedCommuteMethod, setSelectedCommuteMethod] = useState<string>('all')
  const [selectedMarketingSource, setSelectedMarketingSource] = useState<string>('all')
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState<Date | undefined>()
  const [enrollmentDateTo, setEnrollmentDateTo] = useState<Date | undefined>()
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [grades, setGrades] = useState<string[]>([])
  const [schools, setSchools] = useState<string[]>([])

  const { toast } = useToast()

  // Load filter options and initial students in parallel on mount
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      try {
        // 병렬로 필터 옵션과 학생 데이터를 동시에 로드
        const [filterResult, studentsResult] = await Promise.all([
          getStudentFilterOptions(),
          getStudents({})
        ])

        // 필터 옵션 설정
        if (filterResult.success && filterResult.data) {
          setGrades(filterResult.data.grades)
          setSchools(filterResult.data.schools)
          setClasses(filterResult.data.classes)
        } else {
          console.error('[StudentList] Failed to load filter options:', filterResult.error)
        }

        // 학생 데이터 설정
        if (studentsResult.success && studentsResult.data) {
          const formattedStudents = studentsResult.data.map(s => ({
            id: s.id,
            student_code: s.student_code,
            grade: s.grade,
            school: s.school,
            enrollment_date: s.enrollment_date,
            birth_date: null,
            gender: null,
            student_phone: null,
            profile_image_url: null,
            users: {
              name: s.name,
              email: s.email,
              phone: s.phone,
            },
            class_enrollments: s.classes.map((c: { id?: string; name: string }) => ({
              classes: { name: c.name }
            })),
            recentAttendance: [],
          }))
          setStudents(formattedStudents as Student[])
        } else {
          console.error('[StudentList] Failed to load students:', studentsResult.error)
        }
      } catch (error) {
        console.error('[StudentList] Failed to load initial data:', error)
        toast({
          title: '데이터 로드 실패',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [toast])

  // Load students when filters change (skip initial load)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      return
    }
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedClass, selectedSchool, selectedCommuteMethod, selectedMarketingSource, enrollmentDateFrom, enrollmentDateTo])

  async function loadFilterOptions() {
    try {
      console.log('[StudentList] Loading filter options...')
      const result = await getStudentFilterOptions()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load filter options')
      }

      console.log('[StudentList] Filter options loaded:', result.data)
      setGrades(result.data.grades)
      setSchools(result.data.schools)
      setClasses(result.data.classes)
    } catch (error) {
      console.error('[StudentList] Failed to load filter options:', error)
      toast({
        title: '필터 옵션 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadStudents() {
    try {
      setLoading(true)
      console.log('[StudentList] Loading students with filters...')

      const result = await getStudents({
        grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        classId: selectedClass !== 'all' ? selectedClass : undefined,
        school: selectedSchool !== 'all' ? selectedSchool : undefined,
        commuteMethod: selectedCommuteMethod !== 'all' ? selectedCommuteMethod : undefined,
        marketingSource: selectedMarketingSource !== 'all' ? selectedMarketingSource : undefined,
        enrollmentDateFrom: enrollmentDateFrom ? format(enrollmentDateFrom, 'yyyy-MM-dd') : undefined,
        enrollmentDateTo: enrollmentDateTo ? format(enrollmentDateTo, 'yyyy-MM-dd') : undefined,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load students')
      }

      console.log('[StudentList] Students loaded:', result.data.length)

      // Transform to Student type for table
      const formattedStudents = result.data.map(s => ({
        id: s.id,
        student_code: s.student_code,
        grade: s.grade,
        school: s.school,
        enrollment_date: s.enrollment_date,
        birth_date: null, // Not included in query
        gender: null, // Not included in query
        student_phone: null, // Not included in query
        profile_image_url: null, // Not included in query
        users: {
          name: s.name,
          email: s.email,
          phone: s.phone,
        },
        class_enrollments: s.classes.map((c: { id?: string; name: string }) => ({
          classes: { name: c.name }
        })),
        recentAttendance: [], // TODO: Add if needed
      }))

      setStudents(formattedStudents as Student[])
    } catch (error) {
      console.error('[StudentList] Failed to load students:', error)
      toast({
        title: '학생 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(studentId: string, studentName: string) {
    try {
      const result = await deleteStudent(studentId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete student')
      }

      toast({
        title: '학생 삭제 완료',
        description: `${studentName} 학생이 성공적으로 삭제되었습니다.`,
      })

      // Reload students
      await loadStudents()
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
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Grade Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">학년</label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <SelectValue placeholder="학년 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {grades.map(grade => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Class Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">수업</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="수업 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* School Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">학교</label>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger>
              <SelectValue placeholder="학교 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {schools.map(school => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commute Method Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">통학 방법</label>
          <Select value={selectedCommuteMethod} onValueChange={setSelectedCommuteMethod}>
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

        {/* Marketing Source Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">유입 경로</label>
          <Select value={selectedMarketingSource} onValueChange={setSelectedMarketingSource}>
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

        {/* Enrollment Date Range */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">등록일 (시작)</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {enrollmentDateFrom ? format(enrollmentDateFrom, 'PPP', { locale: ko }) : '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={enrollmentDateFrom} onSelect={setEnrollmentDateFrom} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <label className="text-sm font-medium">등록일 (종료)</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {enrollmentDateTo ? format(enrollmentDateTo, 'PPP', { locale: ko }) : '날짜 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={enrollmentDateTo} onSelect={setEnrollmentDateTo} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium opacity-0">Clear</label>
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            필터 초기화
          </Button>
        </div>
      </div>

      {/* Student Table */}
      <StudentTableImproved
        data={students}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  )
}
