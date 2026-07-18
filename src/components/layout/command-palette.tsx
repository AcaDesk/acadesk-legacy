'use client'

/**
 * 전역 커맨드 팔레트 (⌘K / Ctrl+K)
 *
 * - 페이지 빠른 이동 (feature flag 반영)
 * - 자주 쓰는 등록 액션 바로가기
 * - 학생 이름/학번 검색 → 상세로 점프 (search_students_list RPC 재사용)
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@ui/command'
import { Button } from '@ui/button'
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListTodo,
  Loader2,
  MessageSquare,
  NotebookPen,
  Search,
  Settings,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { isFeatureAvailable, type FeatureKey } from '@/lib/features.config'
import { getStudents } from '@/app/actions/students/queries'
import { queryKeys } from '@/lib/query-keys'

interface PageEntry {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  feature?: FeatureKey
  keywords?: string
}

const PAGE_ENTRIES: PageEntry[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard, feature: 'dashboard' },
  { label: '학생 관리', href: '/students', icon: Users, feature: 'studentManagement', keywords: 'students' },
  { label: '출석 관리', href: '/attendance', icon: ClipboardCheck, feature: 'attendanceManagement', keywords: 'attendance 출결' },
  { label: '성적 관리', href: '/grades', icon: GraduationCap, feature: 'gradesManagement', keywords: 'grades 시험' },
  { label: '수업 관리', href: '/classes', icon: BookOpen, feature: 'classManagement', keywords: 'classes 반' },
  { label: '상담 관리', href: '/consultations', icon: MessageSquare, feature: 'consultationManagement', keywords: 'consultations' },
  { label: '리포트', href: '/reports', icon: NotebookPen, feature: 'reportManagement', keywords: 'reports' },
  { label: '숙제 관리', href: '/homeworks', icon: FilePlus2, keywords: 'homeworks' },
  { label: 'TODO 관리', href: '/todos', icon: ListTodo, feature: 'todoManagement', keywords: 'todos 할일' },
  { label: '보호자 관리', href: '/guardians', icon: UsersRound, feature: 'guardianManagement', keywords: 'guardians 학부모' },
  { label: '도서 대여', href: '/library/lendings', icon: Library, feature: 'libraryManagement', keywords: 'library 교재' },
  { label: '메시지 관리', href: '/notifications', icon: MessageSquare, feature: 'notificationSystem', keywords: 'notifications 알림' },
  { label: '학원비 관리', href: '/payments', icon: CreditCard, feature: 'tuitionManagement', keywords: 'payments 수납 청구' },
  { label: '캘린더', href: '/calendar', icon: CalendarDays, feature: 'calendarIntegration', keywords: 'calendar 일정' },
  { label: '학원 설정', href: '/settings/academy', icon: Settings, keywords: 'settings' },
]

const QUICK_ACTIONS: PageEntry[] = [
  { label: '학생 등록', href: '/students/new', icon: UserPlus, feature: 'studentManagement' },
  { label: '학생 일괄 등록 (엑셀)', href: '/students/import', icon: Users, feature: 'studentManagement' },
  { label: '상담 등록', href: '/consultations/new', icon: MessageSquare, feature: 'consultationManagement' },
  { label: '시험 등록', href: '/grades/exams/new', icon: GraduationCap, feature: 'gradesManagement' },
  { label: '숙제 출제', href: '/homeworks/new', icon: FilePlus2 },
  { label: '수업 등록', href: '/classes/new', icon: BookOpen, feature: 'classManagement' },
]

function availableEntries(entries: PageEntry[]): PageEntry[] {
  return entries.filter((e) => !e.feature || isFeatureAvailable(e.feature))
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const router = useRouter()

  // 전역 단축키: ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 200)
    return () => clearTimeout(timer)
  }, [search])

  const studentsQuery = useQuery({
    queryKey: queryKeys.students.list({ view: 'palette', search: debouncedSearch }),
    queryFn: async () => {
      const result = await getStudents({ search: debouncedSearch, page: 1, pageSize: 8 })
      if (!result.success || !result.data) return []
      return result.data as Array<{ id: string; name: string; student_code: string; grade: string | null }>
    },
    enabled: open && debouncedSearch.length >= 1,
    staleTime: 30_000,
  })

  const go = (href: string) => {
    setOpen(false)
    setSearch('')
    router.push(href)
  }

  const pages = availableEntries(PAGE_ENTRIES)
  const actions = availableEntries(QUICK_ACTIONS)
  const students = studentsQuery.data ?? []

  return (
    <>
      {/* 헤더 트리거 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground"
        aria-label="검색 및 빠른 이동 (Cmd+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">검색</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium lg:inline-flex">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="학생 이름, 페이지, 액션 검색..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {studentsQuery.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> 검색 중...
              </span>
            ) : (
              '검색 결과가 없습니다'
            )}
          </CommandEmpty>

          {students.length > 0 && (
            <>
              <CommandGroup heading="학생">
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={`학생 ${student.name} ${student.student_code}`}
                    onSelect={() => go(`/students/${student.id}`)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{student.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {student.student_code}
                      {student.grade ? ` · ${student.grade}` : ''}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading="빠른 액션">
            {actions.map((action) => (
              <CommandItem
                key={action.href}
                value={`액션 ${action.label}`}
                onSelect={() => go(action.href)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="페이지 이동">
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                value={`페이지 ${page.label} ${page.keywords ?? ''}`}
                onSelect={() => go(page.href)}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
                <CommandShortcut>{page.href}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
