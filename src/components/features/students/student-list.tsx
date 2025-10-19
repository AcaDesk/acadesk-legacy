'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { StudentTableImproved, Student } from './student-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import {
  createGetUniqueGradesUseCase,
  createGetUniqueSchoolsUseCase,
  createDeleteStudentUseCase,
} from '@/application/factories/studentUseCaseFactory.client'

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
  const [tenantId, setTenantId] = useState<string | null>(null)

  const { toast} = useToast()
  const supabase = createClient()

  // Load tenant ID
  useEffect(() => {
    async function loadTenantId() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (data?.tenant_id) {
          setTenantId(data.tenant_id)
        }
      }
    }
    loadTenantId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (tenantId) {
      loadClasses()
      loadGrades()
      loadSchools()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedClass, selectedSchool, selectedCommuteMethod, selectedMarketingSource, enrollmentDateFrom, enrollmentDateTo])

  async function loadStudents() {
    try {
      setLoading(true)

      let query = supabase
        .from('students')
        .select(`
          id,
          student_code,
          grade,
          school,
          enrollment_date,
          birth_date,
          gender,
          student_phone,
          profile_image_url,
          users (
            name,
            email,
            phone
          ),
          class_enrollments (
            classes (
              name
            )
          )
        `)
        .is('deleted_at', null)

      if (selectedGrade !== 'all') {
        query = query.eq('grade', selectedGrade)
      }

      if (selectedSchool !== 'all') {
        query = query.eq('school', selectedSchool)
      }

      if (selectedCommuteMethod !== 'all') {
        query = query.eq('commute_method', selectedCommuteMethod)
      }

      if (selectedMarketingSource !== 'all') {
        query = query.eq('marketing_source', selectedMarketingSource)
      }

      if (enrollmentDateFrom) {
        query = query.gte('enrollment_date', format(enrollmentDateFrom, 'yyyy-MM-dd'))
      }
      if (enrollmentDateTo) {
        query = query.lte('enrollment_date', format(enrollmentDateTo, 'yyyy-MM-dd'))
      }

      query = query.order('student_code')

      const { data, error } = await query

      if (error) throw error

      // TODO: 출결 데이터는 추후 RPC 함수나 뷰를 통해 최적화하여 조회
      // 임시로 빈 배열로 설정
      const studentsWithAttendance = (data || []).map(student => ({
        ...student,
        users: Array.isArray(student.users) ? student.users[0] || null : student.users,
        class_enrollments: student.class_enrollments?.map(enrollment => ({
          classes: Array.isArray(enrollment.classes) ? enrollment.classes[0] || null : enrollment.classes
        })) || [],
        recentAttendance: []
      }))

      setStudents(studentsWithAttendance as Student[])
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadClasses() {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      toast({
        title: '수업 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadGrades() {
    if (!tenantId) return

    try {
      const getUniqueGradesUseCase = createGetUniqueGradesUseCase()
      const { grades: uniqueGrades, error } = await getUniqueGradesUseCase.execute({ tenantId })

      if (error) throw error
      setGrades(uniqueGrades)
    } catch (error) {
      toast({
        title: '학년 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadSchools() {
    if (!tenantId) return

    try {
      const getUniqueSchoolsUseCase = createGetUniqueSchoolsUseCase()
      const { schools: uniqueSchools, error } = await getUniqueSchoolsUseCase.execute({ tenantId })

      if (error) throw error
      setSchools(uniqueSchools)
    } catch (error) {
      toast({
        title: '학교 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 학생을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const deleteStudentUseCase = createDeleteStudentUseCase()
      await deleteStudentUseCase.execute(id)

      toast({
        title: '삭제 완료',
        description: `${name} 학생이 삭제되었습니다.`,
      })

      loadStudents()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // Filter students on client side for class filter
  const displayStudents = selectedClass !== 'all'
    ? students.filter((student) =>
        student.class_enrollments?.some(
          (enrollment) => enrollment.classes?.name === selectedClass
        )
      )
    : students

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="학년 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {grades.map((grade) => (
              <SelectItem key={grade} value={grade as string}>
                {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="수업 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.name}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger className="w-[140px]">
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

        <Select value={selectedCommuteMethod} onValueChange={setSelectedCommuteMethod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="등원 방법" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="shuttle">셔틀버스</SelectItem>
            <SelectItem value="walk">도보</SelectItem>
            <SelectItem value="private">자가</SelectItem>
            <SelectItem value="public">대중교통</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedMarketingSource} onValueChange={setSelectedMarketingSource}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="마케팅 경로" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="referral">지인 소개</SelectItem>
            <SelectItem value="blog">블로그</SelectItem>
            <SelectItem value="sign">간판</SelectItem>
            <SelectItem value="online_ad">온라인 광고</SelectItem>
            <SelectItem value="social_media">SNS</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {enrollmentDateFrom || enrollmentDateTo ? (
                <span className="text-sm">
                  {enrollmentDateFrom && format(enrollmentDateFrom, 'yy/MM/dd')}
                  {enrollmentDateFrom && enrollmentDateTo && ' - '}
                  {enrollmentDateTo && format(enrollmentDateTo, 'yy/MM/dd')}
                </span>
              ) : (
                <span className="text-muted-foreground">입회일 필터</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">시작일</label>
                <Calendar
                  mode="single"
                  selected={enrollmentDateFrom}
                  onSelect={setEnrollmentDateFrom}
                  locale={ko}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">종료일</label>
                <Calendar
                  mode="single"
                  selected={enrollmentDateTo}
                  onSelect={setEnrollmentDateTo}
                  locale={ko}
                />
              </div>
              {(enrollmentDateFrom || enrollmentDateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setEnrollmentDateFrom(undefined)
                    setEnrollmentDateTo(undefined)
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  날짜 초기화
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {(selectedGrade !== 'all' ||
          selectedClass !== 'all' ||
          selectedSchool !== 'all' ||
          selectedCommuteMethod !== 'all' ||
          selectedMarketingSource !== 'all' ||
          enrollmentDateFrom ||
          enrollmentDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedGrade('all')
              setSelectedClass('all')
              setSelectedSchool('all')
              setSelectedCommuteMethod('all')
              setSelectedMarketingSource('all')
              setEnrollmentDateFrom(undefined)
              setEnrollmentDateTo(undefined)
            }}
          >
            <X className="mr-2 h-4 w-4" />
            전체 초기화
          </Button>
        )}
      </div>

      {/* Table */}
      <StudentTableImproved
        data={displayStudents}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  )
}
