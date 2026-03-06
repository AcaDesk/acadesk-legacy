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
import { DatePicker } from '@ui/date-picker'
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
import { getTodayKST, formatDate } from '@/lib/utils'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { PendingSyncBadge } from '@ui/pending-sync-badge'
import {
  saveRosterToIDB,
  saveAttendanceRecordsToIDB,
  getAttendanceRecordsFromIDB,
  getRosterFromIDB,
  updateAttendanceRecordInIDB,
  deleteAttendanceRecordFromIDB,
  type AttendanceRecord as IDBAttendanceRecord,
} from '@/lib/pwa/indexeddb'
import { enqueueMutation } from '@/lib/pwa/offline-queue'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialRoster?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialClasses?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialRecords?: any[]
  initialDate?: string
  tenantId?: string
}

/**
 * 로스터 + 출석기록을 결합하여 StudentAttendance 리스트 생성
 */
function buildStudentList(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enrollments: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attendances: any[],
  classesMap: ClassInfo[]
): StudentAttendance[] {
  // 출석 기록을 class_id + student_id 복합키로 맵핑 (status priority 기반 dedup)
  const STATUS_PRIORITY: Record<string, number> = { present: 2, late: 1, left_early: 1, absent: 0, excused: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attendanceMap = new Map<string, any>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return enrollments.map((e: any) => {
    const student = e.students
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attendance = (attendanceMap.get(`${e.class_id}:${e.student_id}`) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e.class_id ? undefined : attendanceByStudentId.get(e.student_id))) as any

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
      departureTime: attendance?.check_out_at
        ? new Date(attendance.check_out_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : undefined,
      source: attendance?.source || undefined,
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
  tenantId,
}: AttendanceCheckPageProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(!initialRoster)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { isOnline } = useNetworkStatus()

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
  const [contactContext, setContactContext] = useState<'absent' | 'self_study' | 'makeup' | 'late' | 'early_leave' | null>(null)

  // 로스터: 한 번만 로드하고 ref에 고정
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rosterRef = useRef<any[]>(initialRoster || [])
  const rosterLoadedRef = useRef(!!initialRoster)

  // 클래스 목록
  const classesRef = useRef<ClassInfo[]>(
    initialClasses
      ? initialClasses
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((c: any) => !(c as any).meta?.attendance_default)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((c: any) => ({ id: c.id, name: c.name }))
      : []
  )
  const [classes, setClasses] = useState<ClassInfo[]>(classesRef.current)
  const [classesLoaded, setClassesLoaded] = useState(!!initialClasses)

  // 출석기록 메모리 캐시: key = date, value = attendance records
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordsCacheRef = useRef(new Map<string, any[]>())

  // 학생 목록 (뷰용)
  const [students, setStudents] = useState<StudentAttendance[]>(() => {
    if (initialRoster && initialRecords) {
      return buildStudentList(initialRoster, initialRecords, classesRef.current)
    }
    return []
  })

  // 초기 레코드를 캐시에 삽입 + IDB에 백그라운드 저장
  useEffect(() => {
    if (initialRecords && initialDate) {
      recordsCacheRef.current.set(initialDate, initialRecords)
    }
    // SSR 데이터를 IDB에 백그라운드로 저장 (오프라인 폴백용)
    if (tenantId) {
      if (initialRoster && initialRoster.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saveRosterToIDB(tenantId, initialRoster.map((e: any) => ({
          tenantId,
          studentId: e.student_id,
          studentName: e.students?.users?.name || '',
          className: null,
          classId: e.class_id || null,
          schoolName: e.students?.school || null,
          schoolLevel: null,
          grade: e.students?.grade || null,
        }))).catch(() => {})
      }
      if (initialRecords && initialDate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saveAttendanceRecordsToIDB(tenantId, initialDate, initialRecords.map((a: any) => ({
          tenantId,
          date: initialDate,
          studentId: a.student_id,
          status: a.status || null,
          checkInAt: a.check_in_at || null,
          checkOutAt: a.check_out_at || null,
          source: a.source || null,
          sessionId: a.session_id || null,
          classId: a.attendance_sessions?.class_id || null,
          isSelfStudy: a.is_self_study || false,
          isMakeupClass: a.is_makeup_class || false,
        }))).catch(() => {})
      }
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // IDB 레코드 → 서버 형태로 변환 (buildStudentList 호환)
  const idbRecordsToServerFormat = useCallback((idbRecords: IDBAttendanceRecord[]) => {
    return idbRecords.map(r => ({
      student_id: r.studentId,
      status: r.status,
      check_in_at: r.checkInAt,
      check_out_at: (r as any).checkOutAt ?? null,
      source: (r as any).source ?? null,
      session_id: r.sessionId,
      is_self_study: r.isSelfStudy,
      is_makeup_class: r.isMakeupClass,
      attendance_sessions: r.classId ? { class_id: r.classId } : null,
    }))
  }, [])

  // 출석기록 로드 (날짜 변경 시) — 오프라인 IDB 폴백 포함
  const loadRecordsForDate = useCallback(async (date: string) => {
    const roster = rosterRef.current
    if (roster.length === 0) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // 서버 실패 + 오프라인 → IDB 폴백
        if (!cached && tenantId) {
          const idbRecords = await getAttendanceRecordsFromIDB(tenantId, date).catch(() => [])
          if (idbRecords.length > 0) {
            const serverFormat = idbRecordsToServerFormat(idbRecords)
            recordsCacheRef.current.set(date, serverFormat)
            setStudents(buildStudentList(roster, serverFormat, classesRef.current))
            return
          }
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

      // 서버 성공 시 IDB에도 저장
      if (tenantId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saveAttendanceRecordsToIDB(tenantId, date, attendances.map((a: any) => ({
          tenantId,
          date,
          studentId: a.student_id,
          status: a.status || null,
          checkInAt: a.check_in_at || null,
          checkOutAt: a.check_out_at || null,
          source: a.source || null,
          sessionId: a.session_id || null,
          classId: a.attendance_sessions?.class_id || null,
          isSelfStudy: a.is_self_study || false,
          isMakeupClass: a.is_makeup_class || false,
        }))).catch(() => {})
      }
    } catch (error) {
      console.error('Load records error:', error)
      // 서버 에러 + 오프라인 → IDB 폴백
      if (!cached && tenantId) {
        try {
          const idbRecords = await getAttendanceRecordsFromIDB(tenantId, date)
          if (idbRecords.length > 0) {
            const serverFormat = idbRecordsToServerFormat(idbRecords)
            recordsCacheRef.current.set(date, serverFormat)
            setStudents(buildStudentList(roster, serverFormat, classesRef.current))
            return
          }
        } catch { /* IDB 실패도 무시 */ }
        toast({
          title: '오류 발생',
          description: '출석 데이터를 불러오는 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [toast, tenantId, idbRecordsToServerFormat])

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
            ? { ...s, status: null, arrivalTime: undefined, departureTime: undefined, source: undefined, isSelfStudy: false, isMakeupClass: false }
            : s
        )
      )

      const cancelPayload = {
        date: currentDate,
        studentId: student.studentId,
        classId: student.classId,
      }

      if (!isOnline && tenantId) {
        // 오프라인: 큐에 추가 + IDB 레코드 삭제
        enqueueMutation(tenantId, 'cancelAttendance', cancelPayload).catch(() => {})
        deleteAttendanceRecordFromIDB(tenantId, currentDate, student.studentId).catch(() => {})
        recordsCacheRef.current.delete(currentDate)
        return
      }

      startTransition(async () => {
        const result = await cancelAttendance(cancelPayload)

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
                source: 'manual' as const,
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

      const savePayload = {
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: UI_TO_DB_STATUS[status],
        checkInAt: (status === 'present' || status === 'late') ? time : undefined,
        isSelfStudy: student.isSelfStudy,
        isMakeupClass: student.isMakeupClass,
      }

      if (!isOnline && tenantId) {
        // 오프라인: 큐에 추가 + IDB 레코드 업데이트
        enqueueMutation(tenantId, 'saveAttendance', savePayload).catch(() => {})
        updateAttendanceRecordInIDB({
          tenantId,
          date: currentDate,
          studentId: student.studentId,
          status: UI_TO_DB_STATUS[status],
          checkInAt: (status === 'present' || status === 'late') ? time : null,
          sessionId: student.sessionId || null,
          classId: student.classId || null,
          isSelfStudy: student.isSelfStudy,
          isMakeupClass: student.isMakeupClass,
        }).catch(() => {})
        recordsCacheRef.current.delete(currentDate)
        return
      }

      startTransition(async () => {
        const result = await saveAttendance(savePayload)

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

  // 자습/보강 공통 서버 업데이트 헬퍼
  const saveToggleFlag = (student: StudentAttendance, isSelfStudy: boolean, isMakeupClass: boolean) => {
    const payload = {
      classId: student.classId,
      date: currentDate,
      studentId: student.studentId,
      status: student.status ? UI_TO_DB_STATUS[student.status] : 'present',
      isSelfStudy,
      isMakeupClass,
    }

    if (!isOnline && tenantId) {
      enqueueMutation(tenantId, 'saveAttendance', payload).catch(() => {})
      recordsCacheRef.current.delete(currentDate)
      return
    }

    startTransition(async () => {
      const result = await saveAttendance(payload)
      if (!result.success) {
        toast({
          title: '저장 실패',
          description: `${student.name} 학생 상태 저장에 실패했습니다.`,
          variant: 'destructive',
        })
        recordsCacheRef.current.delete(currentDate)
        loadRecordsForDate(currentDate)
      } else {
        recordsCacheRef.current.delete(currentDate)
      }
    })
  }

  // 자습 토글
  const toggleSelfStudy = (student: StudentAttendance) => {
    const newValue = !student.isSelfStudy
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === student.studentId && s.classId === student.classId
          ? { ...s, isSelfStudy: newValue }
          : s
      )
    )
    saveToggleFlag(student, newValue, student.isMakeupClass)
  }

  // 보강 토글
  const toggleMakeupClass = (student: StudentAttendance) => {
    const newValue = !student.isMakeupClass
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === student.studentId && s.classId === student.classId
          ? { ...s, isMakeupClass: newValue }
          : s
      )
    )
    saveToggleFlag(student, student.isSelfStudy, newValue)
  }

  const getAttendanceContext = (student: StudentAttendance): 'absent' | 'self_study' | 'makeup' | 'late' | 'early_leave' | null => {
    if (student.isSelfStudy) return 'self_study'
    if (student.isMakeupClass) return 'makeup'
    if (student.status === 'absent') return 'absent'
    if (student.status === 'late') return 'late'
    if (student.status === 'early_leave') return 'early_leave'
    return 'absent'
  }

  const openContactDialog = (student: StudentAttendance) => {
    if (contactPreparingStudentId) return

    // 다이얼로그를 즉시 열고, 세션이 없으면 백그라운드에서 생성
    const ctx = getAttendanceContext(student)
    setContactContext(ctx)
    setSelectedContactStudent(student)
    setContactDialogOpen(true)

    // 세션이 없는 경우 백그라운드에서 출석 레코드 생성 → sessionId 업데이트
    if (!student.sessionId) {
      setContactPreparingStudentId(student.studentId)
      const fallbackStatus = student.status ?? 'absent'
      saveAttendance({
        classId: student.classId,
        date: currentDate,
        studentId: student.studentId,
        status: UI_TO_DB_STATUS[fallbackStatus],
        checkInAt: fallbackStatus === 'late' ? new Date().toISOString() : undefined,
        isSelfStudy: student.isSelfStudy,
        isMakeupClass: student.isMakeupClass,
      }).then((result) => {
        if (result.success && result.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          setSelectedContactStudent(updatedStudent)
          recordsCacheRef.current.delete(currentDate)
        }
      }).catch(() => {
        // 백그라운드 실패는 조용히 처리 (다이얼로그는 이미 열려 있음)
      }).finally(() => {
        setContactPreparingStudentId(null)
      })
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
    <div className="space-y-4 md:space-y-6 pb-20 flex flex-col h-full">
      {/* 1. Top Header: Date & Summary & Download */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 shrink-0">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Date Picker UI */}
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

            <DatePicker
              value={new Date(currentDate + 'T00:00:00')}
              onChange={(date) => date && setCurrentDate(formatDate(date))}
              dateFormat="yyyy.MM.dd (eee)"
              className="h-8 px-3 py-1 text-sm font-semibold"
            />

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

          {/* 출석 현황 (모바일: 인라인) */}
          <div className="ml-auto flex items-center gap-2">
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <PendingSyncBadge tenantId={tenantId} />
            <span className="text-sm font-semibold text-foreground">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span className="text-green-600 dark:text-green-400">{presentCount}</span>
                  <span className="text-muted-foreground">/{filteredStudents.length}</span>
                </>
              )}
            </span>
          </div>
        </div>

        <Button variant="outline" className="hidden md:flex">
          <Download className="h-4 w-4 mr-2" />
          엑셀 다운로드
        </Button>
      </div>

      {/* 2. Control Bar: Classes & Filters */}
      <div className="flex flex-col gap-2 md:gap-4 shrink-0">
        {/* Class Tabs — 모바일에서도 수평 스크롤 */}
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-0.5 md:bg-muted/50 md:p-2 md:rounded-lg md:border md:border-border">
          <Button
            variant={!selectedClassId ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedClassId(null)}
            className={cn('whitespace-nowrap h-7 md:h-9 text-xs md:text-sm px-2.5 md:px-3', !selectedClassId && 'shadow-md')}
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
                'whitespace-nowrap h-7 md:h-9 text-xs md:text-sm px-2.5 md:px-3',
                selectedClassId === cls.id && 'shadow-md'
              )}
            >
              {cls.name}
            </Button>
          ))}
        </div>

        {/* Filter & Search — 모바일: 한 줄로 압축 */}
        <div className="flex gap-1.5 md:gap-2 items-center md:bg-muted/50 md:p-2 md:rounded-lg md:border md:border-border">
          {/* 학교급 필터 — 모바일에서는 축약 */}
          <div className="flex bg-card p-0.5 md:p-1 rounded-md md:rounded-lg border border-border shadow-sm shrink-0">
            {([
              { value: 'all', label: '전체', mobileLabel: '전체' },
              { value: 'elementary', label: '초등', mobileLabel: '초' },
              { value: 'middle', label: '중등', mobileLabel: '중' },
              { value: 'high', label: '고등', mobileLabel: '고' },
            ] as const).map(({ value, label, mobileLabel }) => (
              <button
                key={value}
                onClick={() => setSelectedSchoolLevel(value)}
                className={cn(
                  'px-2 md:px-3 py-1 md:py-1.5 rounded-sm md:rounded-md text-[11px] md:text-xs font-semibold transition-all',
                  selectedSchoolLevel === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="md:hidden">{mobileLabel}</span>
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* 출석 상태 필터 */}
          <div className="flex bg-card p-0.5 md:p-1 rounded-md md:rounded-lg border border-border shadow-sm shrink-0">
            {(['all', 'present', 'absent'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={cn(
                  'px-2 md:px-3 py-1 md:py-1.5 rounded-sm md:rounded-md text-[11px] md:text-xs font-semibold transition-all',
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

          {/* 검색 */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 md:pl-9 h-7 md:h-9 text-xs md:text-sm"
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

      {selectedContactStudent && (
        <ContactGuardianDialog
          open={contactDialogOpen}
          onOpenChange={(open) => {
            setContactDialogOpen(open)
            if (!open) {
              setSelectedContactStudent(null)
              setContactContext(null)
            }
          }}
          studentId={selectedContactStudent.studentId}
          studentName={selectedContactStudent.name}
          sessionId={selectedContactStudent.sessionId ?? null}
          attendanceContext={contactContext}
        />
      )}
    </div>
  )
}
