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
import {
  createGetUniqueGradesUseCase,
  createGetUniqueSchoolsUseCase,
  createGetStudentsWithDetailsUseCase,
} from '@core/application/factories/studentUseCaseFactory.client'
import { createGetActiveClassesUseCase } from '@core/application/factories/classUseCaseFactory.client'
import { deleteStudent } from '@/app/actions/students'

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
  const [initError, setInitError] = useState<string | null>(null)

  const { toast } = useToast()

  // Load tenant ID
  useEffect(() => {
    async function loadTenantId() {
      try {
        console.log('[StudentList] tenantId 로딩 시작')
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
          console.error('[StudentList] 인증 에러:', authError)
          setInitError('로그인 정보를 불러올 수 없습니다.')
          setLoading(false)
          return
        }

        if (!user) {
          console.error('[StudentList] 사용자 정보 없음')
          setInitError('로그인이 필요합니다.')
          setLoading(false)
          return
        }

        console.log('[StudentList] 사용자 ID:', user.id)

        const { data, error } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[StudentList] tenantId 조회 에러:', error)
          setInitError('사용자 정보를 불러올 수 없습니다.')
          setLoading(false)
          return
        }

        if (!data?.tenant_id) {
          console.error('[StudentList] tenantId가 없음:', data)
          setInitError('테넌트 정보가 없습니다.')
          setLoading(false)
          return
        }

        console.log('[StudentList] tenantId 로딩 완료:', data.tenant_id)
        setTenantId(data.tenant_id)
      } catch (error) {
        console.error('[StudentList] tenantId 로딩 중 예외 발생:', error)
        setInitError('초기화 중 오류가 발생했습니다.')
        setLoading(false)
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
    if (tenantId) {
      loadStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedGrade, selectedClass, selectedSchool, selectedCommuteMethod, selectedMarketingSource, enrollmentDateFrom, enrollmentDateTo])

  async function loadStudents() {
    if (!tenantId) {
      console.log('[StudentList] tenantId가 없어 조회를 건너뜁니다')
      return
    }

    try {
      setLoading(true)
      console.log('[StudentList] 학생 데이터 로드 시작', { tenantId })

      // Use Case를 통한 학생 데이터 로드
      const useCase = createGetStudentsWithDetailsUseCase()
      console.log('[StudentList] Use Case 생성 완료, execute 호출 시작')

      const { students: studentsData, error } = await useCase.execute({
        tenantId,
        filters: {
          grade: selectedGrade !== 'all' ? selectedGrade : undefined,
          school: selectedSchool !== 'all' ? selectedSchool : undefined,
          commuteMethod: selectedCommuteMethod !== 'all' ? selectedCommuteMethod : undefined,
          marketingSource: selectedMarketingSource !== 'all' ? selectedMarketingSource : undefined,
          enrollmentDateFrom: enrollmentDateFrom ? format(enrollmentDateFrom, 'yyyy-MM-dd') : undefined,
          enrollmentDateTo: enrollmentDateTo ? format(enrollmentDateTo, 'yyyy-MM-dd') : undefined,
        },
      })

      console.log('[StudentList] Use Case 실행 완료', {
        studentCount: studentsData.length,
        hasError: !!error
      })

      if (error) throw error

      // StudentWithDetails를 Student 형식으로 변환
      const formattedStudents = studentsData.map(item => ({
        id: item.student.id,
        student_code: item.student.studentCode.getValue(),
        grade: item.student.grade,
        school: item.student.school,
        enrollment_date: item.student.enrollmentDate?.toISOString().split('T')[0] || null,
        birth_date: item.student.birthDate?.toISOString().split('T')[0] || null,
        gender: item.student.gender,
        student_phone: item.student.studentPhone,
        profile_image_url: item.student.profileImageUrl,
        users: item.userName ? {
          name: item.userName,
          email: item.userEmail,
          phone: item.userPhone,
        } : null,
        class_enrollments: item.classNames.map(name => ({
          classes: { name }
        })),
        recentAttendance: [], // TODO: 추후 RPC 함수나 뷰를 통해 최적화
      }))

      console.log('[StudentList] 학생 데이터 변환 완료', { count: formattedStudents.length })
      setStudents(formattedStudents as Student[])
    } catch (error) {
      console.error('[StudentList] 학생 데이터 로드 실패:', error)
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      console.log('[StudentList] 로딩 상태 종료')
      setLoading(false)
    }
  }

  async function loadClasses() {
    try {
      // Use Case를 통한 활성 클래스 로드
      const useCase = createGetActiveClassesUseCase()
      const activeClasses = await useCase.execute()
      setClasses(activeClasses)
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
      const result = await deleteStudent(id)

      if (!result.success || result.error) {
        throw new Error(result.error || '학생 삭제에 실패했습니다')
      }

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

  // 초기화 에러가 있을 경우 에러 메시지 표시
  if (initError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 border border-destructive/20 bg-destructive/10 rounded-lg">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">{initError}</p>
            <p className="text-sm text-muted-foreground">
              페이지를 새로고침하거나 다시 로그인해주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
