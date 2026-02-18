'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import {
  Search,
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { ContactGuardianDialog } from '@/components/features/attendance/contact-guardian-dialog'
import { AttendanceMobileView } from '@/components/features/attendance/attendance-mobile-view'
import { AttendanceDesktopView } from '@/components/features/attendance/attendance-desktop-view'
import type { StudentAttendance } from '@/components/features/attendance/attendance-mobile-view'
import {
  getAttendanceRecordsByDate,
  saveAttendance,
  cancelAttendance,
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
      sessionId: attendance?.session_id,
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
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [selectedContactStudent, setSelectedContactStudent] = useState<StudentAttendance | null>(null)
  const [contactPreparingStudentId, setContactPreparingStudentId] = useState<string | null>(null)

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

  // 출석 상태 업데이트 (토글: 같은 상태 다시 누르면 취소)
  const updateStatus = (student: StudentAttendance, status: UIAttendanceStatus) => {
    const isToggleOff = student.status === status

    if (isToggleOff) {
      // 토글 취소: status → null, arrivalTime 초기화
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === student.studentId && s.classId === student.classId
            ? { ...s, status: null, arrivalTime: undefined, isSelfStudy: false, isMakeupClass: false }
            : s
        )
      )

      startTransition(async () => {
        const result = await cancelAttendance({
          date: currentDate,
          studentId: student.studentId,
          classId: student.classId,
        })

        if (!result.success) {
          toast({
            title: '취소 실패',
            description: `${student.name} 학생 출석 취소에 실패했습니다.`,
            variant: 'destructive',
          })
          recordsCacheRef.current.delete(currentDate)
          loadRecordsForDate(currentDate)
        } else {
          recordsCacheRef.current.delete(currentDate)
        }
      })
    } else {
      // 상태 변경 또는 새로 체크
      const time = new Date().toISOString()

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
          recordsCacheRef.current.delete(currentDate)
          loadRecordsForDate(currentDate)
        } else {
          recordsCacheRef.current.delete(currentDate)
        }
      })
    }
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

  const openContactDialog = async (student: StudentAttendance) => {
    if (contactPreparingStudentId) return

    if (student.sessionId) {
      setSelectedContactStudent(student)
      setContactDialogOpen(true)
      return
    }

    // 세션이 없는 경우 먼저 출석 레코드를 보장해서 session_id를 확보
    setContactPreparingStudentId(student.studentId)
    try {
      const fallbackStatus = student.status ?? 'absent'
      const result = await saveAttendance({
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: UI_TO_DB_STATUS[fallbackStatus],
        checkInAt: fallbackStatus === 'late' ? new Date().toISOString() : undefined,
        isSelfStudy: student.isSelfStudy,
        isMakeupClass: student.isMakeupClass,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '연락 준비를 위한 출석 저장에 실패했습니다.')
      }

      const saved = result.data as any
      const updatedStudent: StudentAttendance = {
        ...student,
        id: saved.id || student.id,
        sessionId: saved.session_id,
        status: saved.status ? (DB_TO_UI_STATUS[saved.status] || student.status) : student.status,
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === student.studentId && s.classId === student.classId
            ? updatedStudent
            : s
        )
      )
      recordsCacheRef.current.delete(currentDate)

      if (!updatedStudent.sessionId) {
        throw new Error('세션 정보를 찾을 수 없어 연락 창을 열 수 없습니다.')
      }

      setSelectedContactStudent(updatedStudent)
      setContactDialogOpen(true)
    } catch (error) {
      toast({
        title: '연락 창 열기 실패',
        description: error instanceof Error ? error.message : '보호자 연락 창을 열지 못했습니다.',
        variant: 'destructive',
      })
    } finally {
      setContactPreparingStudentId(null)
    }
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
          <AttendanceMobileView
            students={filteredStudents}
            allStudentsEmpty={students.length === 0}
            contactPreparingStudentId={contactPreparingStudentId}
            onUpdateStatus={updateStatus}
            onToggleSelfStudy={toggleSelfStudy}
            onToggleMakeupClass={toggleMakeupClass}
            onOpenContactDialog={openContactDialog}
          />

          {/* --- Desktop View (Table) --- */}
          <AttendanceDesktopView
            students={filteredStudents}
            allStudentsEmpty={students.length === 0}
            contactPreparingStudentId={contactPreparingStudentId}
            onUpdateStatus={updateStatus}
            onToggleSelfStudy={toggleSelfStudy}
            onToggleMakeupClass={toggleMakeupClass}
            onOpenContactDialog={openContactDialog}
          />
        </>
      )}

      {selectedContactStudent?.sessionId && (
        <ContactGuardianDialog
          open={contactDialogOpen}
          onOpenChange={(open) => {
            setContactDialogOpen(open)
            if (!open) setSelectedContactStudent(null)
          }}
          studentId={selectedContactStudent.studentId}
          studentName={selectedContactStudent.name}
          sessionId={selectedContactStudent.sessionId}
        />
      )}
    </div>
  )
}
