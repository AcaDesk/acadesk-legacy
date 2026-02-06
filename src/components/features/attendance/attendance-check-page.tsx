'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'

interface Student {
  id: number
  name: string
  school: string
  className: string
  status: 'present' | 'late' | 'early_leave' | 'absent' | null
  arrivalTime?: string
  isSelfStudy: boolean
  isMakeupClass: boolean
}

export function AttendanceCheckPage() {
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [selectedClass, setSelectedClass] = useState('전체')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>(
    'all'
  )

  // Mock Data
  const classes = [
    '전체',
    '고등 수학 (심화)',
    '수능 영어 독해',
    '중3 과학 실험',
    '예비 고1 국어',
  ]

  const [students, setStudents] = useState<Student[]>([
    {
      id: 1,
      name: '김민지',
      school: '서초중 2',
      className: '고등 수학 (심화)',
      status: 'present',
      arrivalTime: '13:55',
      isSelfStudy: false,
      isMakeupClass: false,
    },
    {
      id: 2,
      name: '이준호',
      school: '반포고 1',
      className: '고등 수학 (심화)',
      status: 'present',
      arrivalTime: '14:00',
      isSelfStudy: true,
      isMakeupClass: false,
    },
    {
      id: 3,
      name: '박서연',
      school: '세화여고 2',
      className: '수능 영어 독해',
      status: 'late',
      arrivalTime: '16:15',
      isSelfStudy: false,
      isMakeupClass: true,
    },
    {
      id: 4,
      name: '최현우',
      school: '서초중 3',
      className: '중3 과학 실험',
      status: null,
      isSelfStudy: false,
      isMakeupClass: false,
    },
    {
      id: 5,
      name: '정우성',
      school: '반포중 1',
      className: '고등 수학 (심화)',
      status: 'absent',
      isSelfStudy: false,
      isMakeupClass: false,
    },
    {
      id: 6,
      name: '강하늘',
      school: '서울고 1',
      className: '수능 영어 독해',
      status: null,
      isSelfStudy: false,
      isMakeupClass: false,
    },
  ])

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
    setCurrentDate(new Date().toISOString().split('T')[0])
  }

  const getFormattedDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
  }

  const updateStatus = (id: number, status: Student['status']) => {
    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              arrivalTime:
                (status === 'present' || status === 'late') && !s.arrivalTime
                  ? time
                  : s.arrivalTime,
            }
          : s
      )
    )
  }

  const toggleSelfStudy = (id: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isSelfStudy: !s.isSelfStudy } : s))
    )
  }

  const toggleMakeupClass = (id: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isMakeupClass: !s.isMakeupClass } : s
      )
    )
  }

  const filteredStudents = students.filter((s) => {
    const matchesClass =
      selectedClass === '전체' || s.className === selectedClass
    const matchesSearch =
      s.name.includes(searchTerm) || s.school.includes(searchTerm)
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'present' &&
        (s.status === 'present' ||
          s.status === 'late' ||
          s.status === 'early_leave')) ||
      (filterStatus === 'absent' && (s.status === 'absent' || s.status === null))
    return matchesClass && matchesSearch && matchesFilter
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
              <span className="text-green-600 dark:text-green-400">
                {presentCount}명
              </span>
              <span className="text-muted-foreground">/</span>
              <span>{filteredStudents.length}명</span>
            </p>
          </div>
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
          {classes.map((cls) => (
            <Button
              key={cls}
              variant={selectedClass === cls ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedClass(cls)}
              className={cn(
                'whitespace-nowrap',
                selectedClass === cls && 'shadow-md'
              )}
            >
              {cls}
            </Button>
          ))}
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
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

      {/* --- Mobile View (Cards) --- */}
      <div className="block md:hidden space-y-4 flex-1 overflow-y-auto">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
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
                      ({student.school})
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
                  onClick={() => updateStatus(student.id, 'present')}
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
                  onClick={() => updateStatus(student.id, 'late')}
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
                  onClick={() => updateStatus(student.id, 'early_leave')}
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
                  onClick={() => updateStatus(student.id, 'absent')}
                  className={cn(
                    'py-3 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1',
                    student.status === 'absent'
                      ? 'bg-destructive text-destructive-foreground shadow-md'
                      : 'bg-muted text-muted-foreground border border-border'
                  )}
                >
                  <XCircle className="h-4 w-4" /> 결석
                </button>
              </div>

              {/* Additional Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => toggleSelfStudy(student.id)}
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
                  onClick={() => toggleMakeupClass(student.id)}
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
                {(student.status === 'absent' || student.status === 'late') && (
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
            검색 결과가 없습니다.
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
                  key={student.id}
                  className="hover:bg-muted/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {student.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.school} • {student.className}
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
                        onClick={() => updateStatus(student.id, 'present')}
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
                        onClick={() => updateStatus(student.id, 'late')}
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
                        onClick={() => updateStatus(student.id, 'early_leave')}
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
                        onClick={() => updateStatus(student.id, 'absent')}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                          student.status === 'absent'
                            ? 'bg-card text-destructive shadow-sm ring-1 ring-border'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        결석
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleSelfStudy(student.id)}
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
                        onClick={() => toggleMakeupClass(student.id)}
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
                        student.status === 'absent') && (
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
        </div>
      </Card>
    </div>
  )
}
