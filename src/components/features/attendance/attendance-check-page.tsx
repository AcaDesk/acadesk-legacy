'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import {
  CheckCircle2,
  Clock,
  LogOut,
  XCircle,
  BookOpen,
  MessageCircle,
  Search,
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  getAttendanceRecordsByDate,
  saveAttendance,
} from '@/app/actions/attendance'
import { UI_TO_DB_STATUS, type UIAttendanceStatus } from '@/core/types/attendance'
import { getTodayKST } from '@/lib/utils'

type SchoolLevel = 'all' | 'elementary' | 'middle' | 'high'

function getSchoolLevel(grade: string): SchoolLevel {
  if (grade.startsWith('초')) return 'elementary'
  if (grade.startsWith('중')) return 'middle'
  if (grade.startsWith('고')) return 'high'
  return 'all'
}

// DB status → UI status 역매핑
const DB_TO_UI_STATUS: Record<string, UIAttendanceStatus> = {
  present: 'present',
  late: 'late',
  left_early: 'early_leave',
  absent: 'absent',
  excused: 'excused',
}

interface StudentAttendance {
  id: string
  studentId: string
  name: string
  school: string
  grade: string
  classId: string | null
  className: string
  status: UIAttendanceStatus | null
  arrivalTime?: string
  isSelfStudy: boolean
  isMakeupClass: boolean
}

interface ClassInfo {
  id: string
  name: string
}

// 서버에서 전달받는 초기 데이터 타입
interface AttendanceCheckPageProps {
  initialRoster?: any[]
  initialClasses?: any[]
  initialRecords?: any[]
  initialDate?: string
}

/**
 * 로스터 + 출석기록을 결합하여 StudentAttendance 리스트 생성
 */
function buildStudentList(
  enrollments: any[],
  attendances: any[],
  classesMap: ClassInfo[]
): StudentAttendance[] {
  // 출석 기록을 class_id + student_id 복합키로 맵핑 (status priority 기반 dedup)
  const STATUS_PRIORITY: Record<string, number> = { present: 2, late: 1, left_early: 1, absent: 0, excused: 0 }

  const attendanceMap = new Map<string, any>()
  const attendanceByStudentId = new Map<string, any>()

  for (const a of attendances) {
    const classId = a.attendance_sessions?.class_id
    const compositeKey = `${classId}:${a.student_id}`
    const existing = attendanceMap.get(compositeKey)
    if (!existing || (STATUS_PRIORITY[a.status] ?? 0) > (STATUS_PRIORITY[existing.status] ?? 0)) {
      attendanceMap.set(compositeKey, a)
    }
    const existingById = attendanceByStudentId.get(a.student_id)
    if (!existingById || (STATUS_PRIORITY[a.status] ?? 0) > (STATUS_PRIORITY[existingById.status] ?? 0)) {
      attendanceByStudentId.set(a.student_id, a)
    }
  }

  return enrollments.map((e: any) => {
    const student = e.students
    const attendance = (
      attendanceMap.get(`${e.class_id}:${e.student_id}`) ||
      (e.class_id ? undefined : attendanceByStudentId.get(e.student_id))
    ) as any

    const classInfo = classesMap.find(c => c.id === e.class_id)

    return {
      id: attendance?.id || `new-${e.student_id}-${e.class_id}`,
      studentId: e.student_id,
      name: student?.users?.name || '이름 없음',
      school: student?.school || '',
      grade: student?.grade || '',
      classId: e.class_id || null,
      className: classInfo?.name || (e.class_id ? '' : '미배정'),
      status: attendance?.status ? DB_TO_UI_STATUS[attendance.status] || null : null,
      arrivalTime: attendance?.check_in_at
        ? new Date(attendance.check_in_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : undefined,
      isSelfStudy: attendance?.is_self_study || false,
      isMakeupClass: attendance?.is_makeup_class || false,
    }
  })
}

export function AttendanceCheckPage({
  initialRoster,
  initialClasses,
  initialRecords,
  initialDate,
}: AttendanceCheckPageProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(!initialRoster)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [currentDate, setCurrentDate] = useState(
    initialDate || getTodayKST()
  )
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all')
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<SchoolLevel>('all')

  // 로스터: 한 번만 로드하고 ref에 고정
  const rosterRef = useRef<any[]>(initialRoster || [])
  const rosterLoadedRef = useRef(!!initialRoster)

  // 클래스 목록
  const classesRef = useRef<ClassInfo[]>(
    initialClasses
      ? initialClasses
          .filter((c: any) => !(c as any).meta?.attendance_default)
          .map((c: any) => ({ id: c.id, name: c.name }))
      : []
  )
  const [classes, setClasses] = useState<ClassInfo[]>(classesRef.current)
  const [classesLoaded, setClassesLoaded] = useState(!!initialClasses)

  // 출석기록 메모리 캐시: key = date, value = attendance records
  const recordsCacheRef = useRef(new Map<string, any[]>())

  // 학생 목록 (뷰용)
  const [students, setStudents] = useState<StudentAttendance[]>(() => {
    if (initialRoster && initialRecords) {
      return buildStudentList(initialRoster, initialRecords, classesRef.current)
    }
    return []
  })

  // 초기 레코드를 캐시에 삽입
  useEffect(() => {
    if (initialRecords && initialDate) {
      recordsCacheRef.current.set(initialDate, initialRecords)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 클래스 목록 로드 (초기 데이터가 없을 때만)
  useEffect(() => {
    if (initialClasses) return
    async function loadClasses() {
      try {
        const { getActiveClasses } = await import('@/app/actions/classes')
        const result = await getActiveClasses()
        if (result.success && result.data && result.data.length > 0) {
          const filtered = result.data
            .filter(c => !(c as any).meta?.attendance_default)
            .map(c => ({ id: c.id, name: c.name }))
          classesRef.current = filtered
          setClasses(filtered)
        }
      } catch {
        // 클래스 로드 실패해도 출석 데이터는 로드 시도
      } finally {
        setClassesLoaded(true)
      }
    }
    loadClasses()
  }, [initialClasses])

  // 로스터 로드 (초기 데이터가 없을 때만)
  useEffect(() => {
    if (initialRoster) return
    async function loadRoster() {
      try {
        const { getAttendanceRoster } = await import('@/app/actions/attendance')
        const result = await getAttendanceRoster()
        if (result.success && result.data) {
          rosterRef.current = result.data.students
          rosterLoadedRef.current = true
        }
      } catch (error) {
        console.error('Load roster error:', error)
        toast({
          title: '데이터 로딩 실패',
          description: '학생 목록을 불러올 수 없습니다.',
          variant: 'destructive',
        })
      }
    }
    loadRoster()
  }, [initialRoster, toast])

  // 출석기록 로드 (날짜 변경 시)
  const loadRecordsForDate = useCallback(async (date: string) => {
    const roster = rosterRef.current
    if (roster.length === 0) return

    const studentIds = [...new Set(roster.map((e: any) => e.student_id))]

    // 캐시 hit → 즉시 렌더 + 백그라운드 refresh
    const cached = recordsCacheRef.current.get(date)
    if (cached) {
      setStudents(buildStudentList(roster, cached, classesRef.current))
      // 백그라운드 refresh
      setIsRefreshing(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const result = await getAttendanceRecordsByDate({
        date,
        studentIds,
      })

      if (!result.success || !result.data) {
        // 캐시가 있으면 캐시 데이터로 유지
        if (!cached) {
          toast({
            title: '데이터 로딩 실패',
            description: result.error || '출석 데이터를 불러올 수 없습니다.',
            variant: 'destructive',
          })
        }
        return
      }

      const attendances = result.data.attendances
      recordsCacheRef.current.set(date, attendances)
      setStudents(buildStudentList(roster, attendances, classesRef.current))
    } catch (error) {
      console.error('Load records error:', error)
      if (!cached) {
        toast({
          title: '오류 발생',
          description: '출석 데이터를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [toast])

  // 초기 로드: 로스터 + 클래스가 모두 준비되면 오늘 출석기록 로드
  useEffect(() => {
    // 이미 초기 데이터가 있으면 스킵 (SSR 데이터 사용)
    if (initialRoster && initialRecords) {
      setIsLoading(false)
      return
    }

    if (!classesLoaded || !rosterLoadedRef.current) return

    async function initialLoad() {
      await loadRecordsForDate(currentDate)
      setIsLoading(false)
    }
    initialLoad()
  }, [classesLoaded, initialRoster, initialRecords]) // eslint-disable-line react-hooks/exhaustive-deps

  // 날짜 변경 시 출석기록만 로드
  const prevDateRef = useRef(currentDate)
  useEffect(() => {
    if (prevDateRef.current === currentDate) return
    prevDateRef.current = currentDate
    if (!rosterLoadedRef.current) return
    loadRecordsForDate(currentDate)
  }, [currentDate, loadRecordsForDate])

  // Date Logic
  const handlePrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const handleToday = () => {
    setCurrentDate(getTodayKST())
  }

  const getFormattedDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
  }

  // 출석 상태 업데이트
  const updateStatus = (student: StudentAttendance, status: UIAttendanceStatus) => {
    const time = new Date().toISOString()

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === student.studentId && s.classId === student.classId
          ? {
              ...s,
              status,
              arrivalTime:
                (status === 'present' || status === 'late') && !s.arrivalTime
                  ? new Date().toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  : s.arrivalTime,
            }
          : s
      )
    )

    // Server update
    startTransition(async () => {
      const result = await saveAttendance({
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: UI_TO_DB_STATUS[status],
        checkInAt: (status === 'present' || status === 'late') ? time : undefined,
        isSelfStudy: student.isSelfStudy,
        isMakeupClass: student.isMakeupClass,
      })

      if (!result.success) {
        toast({
          title: '저장 실패',
          description: result.error
            ? `${student.name} 학생 출석 저장에 실패했습니다. (${result.error})`
            : `${student.name} 학생 출석 저장에 실패했습니다.`,
          variant: 'destructive',
        })
        // Rollback: 현재 날짜 캐시 무효화 후 재조회
        recordsCacheRef.current.delete(currentDate)
        loadRecordsForDate(currentDate)
      } else {
        // 저장 성공 시 현재 날짜 캐시 무효화 (다음 조회 시 fresh data)
        recordsCacheRef.current.delete(currentDate)
      }
    })
  }

  // 자습 토글
  const toggleSelfStudy = (student: StudentAttendance) => {
    const newValue = !student.isSelfStudy

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === student.studentId && s.classId === student.classId
          ? { ...s, isSelfStudy: newValue }
          : s
      )
    )

    // Server update
    startTransition(async () => {
      const result = await saveAttendance({
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: student.status ? UI_TO_DB_STATUS[student.status] : 'present',
        isSelfStudy: newValue,
        isMakeupClass: student.isMakeupClass,
      })

      if (!result.success) {
        toast({
          title: '저장 실패',
          description: result.error
            ? `${student.name} 학생 자습 상태 저장에 실패했습니다. (${result.error})`
            : `${student.name} 학생 자습 상태 저장에 실패했습니다.`,
          variant: 'destructive',
        })
        recordsCacheRef.current.delete(currentDate)
        loadRecordsForDate(currentDate)
      } else {
        recordsCacheRef.current.delete(currentDate)
      }
    })
  }

  // 보강 토글
  const toggleMakeupClass = (student: StudentAttendance) => {
    const newValue = !student.isMakeupClass

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === student.studentId && s.classId === student.classId
          ? { ...s, isMakeupClass: newValue }
          : s
      )
    )

    // Server update
    startTransition(async () => {
      const result = await saveAttendance({
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: student.status ? UI_TO_DB_STATUS[student.status] : 'present',
        isSelfStudy: student.isSelfStudy,
        isMakeupClass: newValue,
      })

      if (!result.success) {
        toast({
          title: '저장 실패',
          description: result.error
            ? `${student.name} 학생 보강 상태 저장에 실패했습니다. (${result.error})`
            : `${student.name} 학생 보강 상태 저장에 실패했습니다.`,
          variant: 'destructive',
        })
        recordsCacheRef.current.delete(currentDate)
        loadRecordsForDate(currentDate)
      } else {
        recordsCacheRef.current.delete(currentDate)
      }
    })
  }

  // 필터링된 학생 목록 (클래스 탭 전환은 클라이언트 필터링만)
  const filteredStudents = students.filter((s) => {
    const matchesClass = !selectedClassId || s.classId === selectedClassId
    const matchesSchoolLevel =
      selectedSchoolLevel === 'all' || getSchoolLevel(s.grade) === selectedSchoolLevel
    const matchesSearch =
      s.name.includes(searchTerm) ||
      s.school.includes(searchTerm) ||
      s.grade.includes(searchTerm)
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'present' &&
        (s.status === 'present' ||
          s.status === 'late' ||
          s.status === 'early_leave')) ||
      (filterStatus === 'absent' && (s.status === 'absent' || s.status === 'excused' || s.status === null))
    return matchesClass && matchesSchoolLevel && matchesSearch && matchesFilter
  })

  const presentCount = filteredStudents.filter(
    (s) => s.status === 'present' || s.status === 'late'
  ).length

  return (
    <div className="space-y-6 pb-20 flex flex-col h-full">
      {/* 1. Top Header: Date & Summary & Download */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Date Picker UI */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-8"
                title="이전 날짜"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="relative">
                <div className="px-4 py-1 text-sm font-semibold text-foreground flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded-md transition-colors">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {getFormattedDate(currentDate)}
                </div>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDay}
                className="h-8 w-8"
                title="다음 날짜"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="secondary" size="sm" onClick={handleToday}>
              오늘
            </Button>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div>
            <p className="text-xs text-muted-foreground font-medium">
              출석 현황
            </p>
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="text-green-600 dark:text-green-400">
                    {presentCount}명
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span>{filteredStudents.length}명</span>
                </>
              )}
            </p>
          </div>

          {isPending && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              저장 중...
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full md:w-auto">
          <Download className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">엑셀 다운로드</span>
          <span className="sm:hidden">다운로드</span>
        </Button>
      </div>

      {/* 2. Control Bar: Classes & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-muted/50 p-2 rounded-lg border border-border shrink-0">
        {/* Class Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full xl:w-auto pb-1 xl:pb-0">
          <Button
            variant={!selectedClassId ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedClassId(null)}
            className={cn('whitespace-nowrap', !selectedClassId && 'shadow-md')}
          >
            전체
          </Button>
          {classes.map((cls) => (
            <Button
              key={cls.id}
              variant={selectedClassId === cls.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedClassId(cls.id)}
              className={cn(
                'whitespace-nowrap',
                selectedClassId === cls.id && 'shadow-md'
              )}
            >
              {cls.name}
            </Button>
          ))}
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="flex bg-card p-1 rounded-lg border border-border shadow-sm shrink-0">
            {([
              { value: 'all', label: '전체' },
              { value: 'elementary', label: '초등' },
              { value: 'middle', label: '중등' },
              { value: 'high', label: '고등' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedSchoolLevel(value)}
                className={cn(
                  'flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  selectedSchoolLevel === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex bg-card p-1 rounded-lg border border-border shadow-sm shrink-0">
            {(['all', 'present', 'absent'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={cn(
                  'flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                  filterStatus === filter
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {filter === 'all'
                  ? '전체'
                  : filter === 'present'
                    ? '출석'
                    : '결석'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="이름 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">출석 데이터를 불러오는 중...</p>
          </div>
        </div>
      ) : (
        <>
          {isRefreshing && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          )}
          {/* --- Mobile View (Cards) --- */}
          <div className="block md:hidden space-y-4 flex-1 overflow-y-auto">
            {filteredStudents.map((student) => (
              <Card
                key={`${student.studentId}-${student.classId}`}
                className={cn(
                  'transition-all',
                  !student.status && 'border-l-4 border-l-muted-foreground/30'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {student.name}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({student.school} {student.grade})
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {student.className}
                      </p>
                    </div>
                    {student.arrivalTime ? (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-muted-foreground block">
                          등원 시간
                        </span>
                        <span className="text-lg font-mono font-semibold text-foreground">
                          {student.arrivalTime}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary">미등원</Badge>
                    )}
                  </div>

                  {/* Mobile Action Buttons (Grid) */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => updateStatus(student, 'present')}
                      className={cn(
                        'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                        student.status === 'present'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" /> 출석
                    </button>
                    <button
                      onClick={() => updateStatus(student, 'late')}
                      className={cn(
                        'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                        student.status === 'late'
                          ? 'bg-amber-500 text-white shadow-md'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      <Clock className="h-4 w-4" /> 지각
                    </button>
                    <button
                      onClick={() => updateStatus(student, 'early_leave')}
                      className={cn(
                        'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                        student.status === 'early_leave'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      <LogOut className="h-4 w-4" /> 조퇴
                    </button>
                    <button
                      onClick={() => updateStatus(student, 'absent')}
                      className={cn(
                        'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                        student.status === 'absent' || student.status === 'excused'
                          ? 'bg-destructive text-destructive-foreground shadow-md'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      <XCircle className="h-4 w-4" /> {student.status === 'excused' ? '사유결석' : '결석'}
                    </button>
                  </div>

                  {/* Additional Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => toggleSelfStudy(student)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                        student.isSelfStudy
                          ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
                          : 'bg-card border border-border text-muted-foreground'
                      )}
                    >
                      <BookOpen className="h-3.5 w-3.5" /> 자습{' '}
                      {student.isSelfStudy ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => toggleMakeupClass(student)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
                        student.isMakeupClass
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                          : 'bg-card border border-border text-muted-foreground'
                      )}
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> 보강{' '}
                      {student.isMakeupClass ? 'ON' : 'OFF'}
                    </button>
                    {(student.status === 'absent' || student.status === 'excused' || student.status === 'late') && (
                      <button className="flex-1 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900 flex items-center justify-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" /> 알림
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {students.length === 0
                  ? '등록된 학생이 없습니다.'
                  : '검색 결과가 없습니다.'}
              </div>
            )}
          </div>

          {/* --- Desktop View (Table) --- */}
          <Card className="hidden md:flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                    <th className="px-6 py-4 font-semibold">학생 정보</th>
                    <th className="px-6 py-4 font-semibold">등원 시간</th>
                    <th className="px-6 py-4 font-semibold text-center">
                      출결 상태 변경
                    </th>
                    <th className="px-6 py-4 font-semibold text-right">추가 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr
                      key={`${student.studentId}-${student.classId}`}
                      className="hover:bg-muted/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {student.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.school} {student.grade} • {student.className}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'font-mono text-sm font-semibold',
                            student.arrivalTime
                              ? 'text-foreground'
                              : 'text-muted-foreground/50'
                          )}
                        >
                          {student.arrivalTime || '--:--'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center gap-1 bg-muted p-1 rounded-lg w-fit mx-auto">
                          <button
                            onClick={() => updateStatus(student, 'present')}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                              student.status === 'present'
                                ? 'bg-card text-green-600 shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            출석
                          </button>
                          <button
                            onClick={() => updateStatus(student, 'late')}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                              student.status === 'late'
                                ? 'bg-card text-amber-600 shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            지각
                          </button>
                          <button
                            onClick={() => updateStatus(student, 'early_leave')}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                              student.status === 'early_leave'
                                ? 'bg-card text-orange-600 shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            조퇴
                          </button>
                          <button
                            onClick={() => updateStatus(student, 'absent')}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                              student.status === 'absent' || student.status === 'excused'
                                ? 'bg-card text-destructive shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {student.status === 'excused' ? '사유결석' : '결석'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleSelfStudy(student)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1',
                              student.isSelfStudy
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900'
                                : 'bg-card border-border text-muted-foreground hover:text-purple-600 hover:border-purple-200'
                            )}
                          >
                            <BookOpen className="h-3 w-3" /> 자습
                          </button>
                          <button
                            onClick={() => toggleMakeupClass(student)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1',
                              student.isMakeupClass
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900'
                                : 'bg-card border-border text-muted-foreground hover:text-blue-600 hover:border-blue-200'
                            )}
                          >
                            <PlusCircle className="h-3 w-3" /> 보강
                          </button>
                          {(student.status === 'late' ||
                            student.status === 'absent' ||
                            student.status === 'excused') && (
                            <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  {students.length === 0
                    ? '등록된 학생이 없습니다.'
                    : '검색 결과가 없습니다.'}
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
