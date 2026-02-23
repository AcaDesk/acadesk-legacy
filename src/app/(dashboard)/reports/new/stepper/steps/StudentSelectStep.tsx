'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Input } from '@ui/input'
import { ScrollArea } from '@ui/scroll-area'
import { Search, X, UserCheck, Clock } from 'lucide-react'
import { type SelectedStudent, getRecentStudents } from '../report-stepper-types'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: { name: string } | null
  class_enrollments?: Array<{ classes: { name: string } | null }>
}

interface StudentSelectStepProps {
  students: Student[]
  selectedStudent: SelectedStudent | null
  onSelect: (student: SelectedStudent) => void
  onClear: () => void
}

export function StudentSelectStep({ students, selectedStudent, onSelect, onClear }: StudentSelectStepProps) {
  const [search, setSearch] = useState('')
  const [activeClass, setActiveClass] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(!selectedStudent)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const recentStudents = useMemo(() => getRecentStudents(), [])

  // 전체 수업(클래스) 목록 추출
  const allClasses = useMemo(() => {
    const classSet = new Set<string>()
    students.forEach((s) => {
      s.class_enrollments?.forEach((e) => {
        if (e.classes?.name) classSet.add(e.classes.name)
      })
    })
    return Array.from(classSet).sort()
  }, [students])

  // 검색어 + 클래스 필터 적용
  const filteredStudents = useMemo(() => {
    let result = students
    if (activeClass) {
      result = result.filter((s) =>
        s.class_enrollments?.some((e) => e.classes?.name === activeClass)
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          (s.users?.name || '').toLowerCase().includes(q) ||
          s.student_code.toLowerCase().includes(q)
      )
    }
    return result
  }, [students, search, activeClass])

  function buildSelected(s: Student): SelectedStudent {
    return {
      id: s.id,
      name: s.users?.name || '이름 없음',
      studentCode: s.student_code,
      grade: s.grade,
      classes:
        s.class_enrollments
          ?.map((e) => e.classes?.name)
          .filter((n): n is string => Boolean(n)) ?? [],
    }
  }

  function handleSelect(studentId: string) {
    const found = students.find((s) => s.id === studentId)
    if (!found) return
    onSelect(buildSelected(found))
    setIsSearching(false)
    setSearch('')
    setActiveClass(null)
  }

  function handleRecentClick(recent: SelectedStudent) {
    const found = students.find((s) => s.id === recent.id)
    if (!found) return
    onSelect(buildSelected(found))
    setIsSearching(false)
  }

  function handleChangeStudent() {
    setIsSearching(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  function handleClear() {
    onClear()
    setIsSearching(true)
    setSearch('')
    setActiveClass(null)
  }

  // 외부에서 학생이 해제되면 검색 패널 표시
  useEffect(() => {
    if (!selectedStudent) setIsSearching(true)
  }, [selectedStudent])

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 선택</CardTitle>
        <CardDescription>
          {selectedStudent
            ? '선택된 학생을 확인하거나 다른 학생으로 변경하세요'
            : `총 ${students.length}명 중 리포트를 생성할 학생을 선택하세요`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── 선택된 학생 카드 ── */}
        {selectedStudent && !isSearching && (
          <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
            <div className="flex items-center gap-4">
              {/* 이니셜 아바타 */}
              <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold select-none">
                {selectedStudent.name[0] ?? '?'}
              </div>

              {/* 학생 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">{selectedStudent.name}</span>
                  <Badge variant="secondary" className="text-xs">{selectedStudent.studentCode}</Badge>
                  {selectedStudent.grade && (
                    <Badge variant="outline" className="text-xs">{selectedStudent.grade}</Badge>
                  )}
                </div>
                {selectedStudent.classes.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedStudent.classes.join(' · ')}
                  </p>
                )}
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleChangeStudent}>
                  변경
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 인라인 검색 패널 ── */}
        {isSearching && (
          <div className="space-y-3">
            {/* 최근 선택 학생 (검색어 없을 때만) */}
            {recentStudents.length > 0 && !search && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  최근 선택
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentStudents.map((recent) => {
                    const exists = students.some((s) => s.id === recent.id)
                    if (!exists) return null
                    return (
                      <button
                        key={recent.id}
                        type="button"
                        onClick={() => handleRecentClick(recent)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all"
                      >
                        <span className="font-medium">{recent.name}</span>
                        <span className="text-xs text-muted-foreground">{recent.studentCode}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 검색 입력 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="이름 또는 학번으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="검색어 지우기"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 클래스 필터 칩 */}
            {allClasses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveClass(null)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs border transition-all',
                    !activeClass
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground hover:bg-muted border-border'
                  )}
                >
                  전체
                </button>
                {allClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setActiveClass(activeClass === cls ? null : cls)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border transition-all',
                      activeClass === cls
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted border-border'
                    )}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}

            {/* 학생 목록 */}
            <ScrollArea className="h-72 rounded-lg border">
              {filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-25" />
                  <p className="text-sm">
                    {search || activeClass ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filteredStudents.map((s) => {
                    const name = s.users?.name || '이름 없음'
                    const classes =
                      s.class_enrollments
                        ?.map((e) => e.classes?.name)
                        .filter((n): n is string => Boolean(n)) ?? []
                    const isSelected = selectedStudent?.id === s.id

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect(s.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        {/* 이니셜 아바타 */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold select-none',
                            isSelected
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {name[0]}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{name}</span>
                            {isSelected && (
                              <UserCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.student_code}
                            {s.grade ? ` · ${s.grade}` : ''}
                            {classes.length > 0 ? ` · ${classes.join(', ')}` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* 하단: 결과 수 + 취소 버튼 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{filteredStudents.length}명 표시</span>
              {selectedStudent && (
                <button
                  type="button"
                  onClick={() => setIsSearching(false)}
                  className="hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
