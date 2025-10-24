'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCircle,
  Settings2,
  ChevronDown,
  ArrowUpDown,
  X,
} from 'lucide-react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { format, differenceInDays } from 'date-fns'
import { motion, AnimatePresence } from 'motion/react'

import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Input } from '@ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Badge } from '@ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'
import { getStudentAvatar } from '@/lib/avatar'
import { cn } from '@/lib/utils'
import { BulkActionsDialog } from './bulk-actions-dialog'

export interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  enrollment_date: string
  birth_date: string | null
  gender: string | null
  student_phone: string | null
  profile_image_url?: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  class_enrollments: Array<{
    classes: {
      name: string
    } | null
  }>
  invoices?: Array<{
    id: string
    status: string
    billing_month: string
    due_date: string
    total_amount: number
    paid_amount: number
  }>
  recentAttendance?: Array<{
    status: string
  }>
}

type BadgeFilter =
  | 'overdue'
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'attendance_issue'
  | 'new_student'
  | 'birthday_today'
  | 'birthday_soon'
  | null

interface StudentTableProps {
  data: Student[]
  loading?: boolean
  onDelete?: (id: string, name: string) => void
}

export function StudentTableImproved({
  data,
  loading = false,
  onDelete,
}: StudentTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [badgeFilter, setBadgeFilter] = React.useState<BadgeFilter>(null)
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [studentToDelete, setStudentToDelete] = React.useState<{ id: string; name: string } | null>(null)

  const isNewStudent = (enrollmentDate: string) => {
    const daysSinceEnrollment = differenceInDays(new Date(), new Date(enrollmentDate))
    return daysSinceEnrollment <= 30
  }

  const isBirthdayToday = (birthDate: string | null) => {
    if (!birthDate) return false
    const today = new Date()
    const birth = new Date(birthDate)
    return today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()
  }

  const isBirthdaySoon = (birthDate: string | null) => {
    if (!birthDate) return false
    const today = new Date()
    const birth = new Date(birthDate)
    birth.setFullYear(today.getFullYear())
    const daysUntilBirthday = differenceInDays(birth, today)
    return daysUntilBirthday > 0 && daysUntilBirthday <= 7
  }

  // 현재 달의 청구서 상태 확인
  const getCurrentMonthInvoiceStatus = (invoices?: Student['invoices']) => {
    if (!invoices || invoices.length === 0) return null

    const currentMonth = format(new Date(), 'yyyy-MM')
    const currentInvoice = invoices.find(inv => inv.billing_month === currentMonth)

    return currentInvoice?.status || null
  }

  // 출결불량 판단 (최근 30일간 결석 3회 이상 또는 지각 5회 이상)
  const hasAttendanceIssue = (recentAttendance?: Student['recentAttendance']) => {
    if (!recentAttendance || recentAttendance.length === 0) return false

    const absentCount = recentAttendance.filter(a => a.status === 'absent').length
    const lateCount = recentAttendance.filter(a => a.status === 'late').length

    return absentCount >= 3 || lateCount >= 5
  }

  // 뱃지 필터에 따라 학생 필터링
  const filteredData = React.useMemo(() => {
    if (!badgeFilter) return data

    return data.filter((student) => {
      const invoiceStatus = getCurrentMonthInvoiceStatus(student.invoices)
      const hasAttendanceProblem = hasAttendanceIssue(student.recentAttendance)

      switch (badgeFilter) {
        case 'overdue':
          return invoiceStatus === 'overdue'
        case 'unpaid':
          return invoiceStatus === 'unpaid'
        case 'partially_paid':
          return invoiceStatus === 'partially_paid'
        case 'paid':
          return invoiceStatus === 'paid'
        case 'attendance_issue':
          return hasAttendanceProblem
        case 'new_student':
          return isNewStudent(student.enrollment_date)
        case 'birthday_today':
          return isBirthdayToday(student.birth_date)
        case 'birthday_soon':
          return isBirthdaySoon(student.birth_date)
        default:
          return true
      }
    })
  }, [data, badgeFilter])

  // 뱃지 클릭 핸들러
  const handleBadgeClick = (filter: BadgeFilter) => {
    if (badgeFilter === filter) {
      setBadgeFilter(null) // 같은 뱃지 클릭 시 필터 해제
    } else {
      setBadgeFilter(filter)
    }
  }

  const columns: ColumnDef<Student>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'student_code',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학번
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('student_code')}</div>
      ),
    },
    {
      accessorKey: 'users',
      header: '이름',
      cell: ({ row }) => {
        const student = row.original
        const invoiceStatus = getCurrentMonthInvoiceStatus(student.invoices)
        const hasAttendanceProblem = hasAttendanceIssue(student.recentAttendance)

        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 bg-muted relative">
              <Image
                src={getStudentAvatar(
                  student.profile_image_url,
                  student.id,
                  student.users?.name || 'Student'
                )}
                alt={student.users?.name || '학생'}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{student.users?.name || '이름 없음'}</span>
                <div className="flex gap-1 flex-wrap">
                  {/* 재무 관련 뱃지 (최우선) */}
                  {invoiceStatus === 'overdue' && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'overdue' && "ring-2 ring-offset-1 ring-destructive"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('overdue')
                      }}
                    >
                      연체
                    </Badge>
                  )}
                  {invoiceStatus === 'unpaid' && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'unpaid' && "ring-2 ring-offset-1 ring-destructive"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('unpaid')
                      }}
                    >
                      미납
                    </Badge>
                  )}
                  {invoiceStatus === 'partially_paid' && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border-orange-500 text-orange-600 cursor-pointer hover:bg-orange-50 transition-colors",
                        badgeFilter === 'partially_paid' && "ring-2 ring-offset-1 ring-orange-500"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('partially_paid')
                      }}
                    >
                      일부납부
                    </Badge>
                  )}
                  {invoiceStatus === 'paid' && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'paid' && "ring-2 ring-offset-1 ring-secondary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('paid')
                      }}
                    >
                      수납완료
                    </Badge>
                  )}

                  {/* 출결 관련 뱃지 */}
                  {hasAttendanceProblem && (
                    <Badge
                      variant="destructive"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'attendance_issue' && "ring-2 ring-offset-1 ring-destructive"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('attendance_issue')
                      }}
                    >
                      출결불량
                    </Badge>
                  )}

                  {/* 학생 상태 뱃지 */}
                  {isNewStudent(student.enrollment_date) && (
                    <Badge
                      variant="default"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'new_student' && "ring-2 ring-offset-1 ring-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('new_student')
                      }}
                    >
                      신규
                    </Badge>
                  )}

                  {/* 생일 뱃지 */}
                  {isBirthdayToday(student.birth_date) && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                        badgeFilter === 'birthday_today' && "ring-2 ring-offset-1 ring-secondary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('birthday_today')
                      }}
                    >
                      생일 🎂
                    </Badge>
                  )}
                  {!isBirthdayToday(student.birth_date) && isBirthdaySoon(student.birth_date) && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs cursor-pointer hover:bg-muted transition-colors",
                        badgeFilter === 'birthday_soon' && "ring-2 ring-offset-1 ring-border"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBadgeClick('birthday_soon')
                      }}
                    >
                      생일임박
                    </Badge>
                  )}
                </div>
              </div>
              {student.users?.phone && (
                <div className="text-xs text-muted-foreground">
                  {student.users.phone}
                </div>
              )}
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: 'grade',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학년
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const grade = row.getValue('grade') as string | null
        return grade ? (
          <Badge variant="outline">{grade}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )
      },
    },
    {
      accessorKey: 'school',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학교
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('school') || '-'}</div>
      ),
    },
    {
      id: 'classes',
      header: '수업',
      cell: ({ row }) => {
        const enrollments = row.original.class_enrollments
        return enrollments && enrollments.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {enrollments.map((enrollment, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {enrollment.classes?.name || 'Unknown'}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">미배정</span>
        )
      },
    },
    {
      accessorKey: 'enrollment_date',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            입회일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(row.getValue('enrollment_date')), 'yyyy-MM-dd')}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const student = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">메뉴 열기</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/students/${student.id}`)
                }}
              >
                <UserCircle className="mr-2 h-4 w-4" />
                상세 보기
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/students/${student.id}/edit`)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                편집
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  setStudentToDelete({
                    id: student.id,
                    name: student.users?.name || '학생',
                  })
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const searchValue = (table.getColumn('users')?.getFilterValue() as string) ?? ''

  // 선택된 학생 목록 가져오기
  const selectedStudents = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  // 일괄 작업 완료 후 처리
  const handleBulkActionsComplete = () => {
    // 선택 해제
    table.toggleAllPageRowsSelected(false)
    setRowSelection({})
    // 부모 컴포넌트에 리로드 요청 (새로고침을 위해)
    window.location.reload()
  }

  // 뱃지 필터 라벨
  const getBadgeFilterLabel = (filter: BadgeFilter): string => {
    switch (filter) {
      case 'overdue': return '연체'
      case 'unpaid': return '미납'
      case 'partially_paid': return '일부납부'
      case 'paid': return '수납완료'
      case 'attendance_issue': return '출결불량'
      case 'new_student': return '신규'
      case 'birthday_today': return '생일 🎂'
      case 'birthday_soon': return '생일임박'
      default: return ''
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* 필터 활성화 알림 */}
      <AnimatePresence>
        {badgeFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-2 px-4 py-3 bg-primary/10 rounded-lg border border-primary/20"
          >
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-medium">
                {getBadgeFilterLabel(badgeFilter)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                필터 활성화됨 • {filteredData.length}명의 학생
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBadgeFilter(null)}
            >
              <X className="mr-2 h-4 w-4" />
              필터 해제
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름으로 검색..."
              value={searchValue}
              onChange={(event) =>
                table.getColumn('users')?.setFilterValue(event.target.value)
              }
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => table.getColumn('users')?.setFilterValue('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">컬럼</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>표시할 컬럼</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const columnLabels: Record<string, string> = {
                  student_code: '학번',
                  grade: '학년',
                  school: '학교',
                  classes: '수업',
                  enrollment_date: '입회일',
                  actions: '작업',
                }

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabels[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <AnimatePresence>
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 rounded-lg border"
          >
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-medium">
                {table.getFilteredSelectedRowModel().rows.length}명 선택됨
              </Badge>
              <span className="text-sm text-muted-foreground">
                / 전체 {table.getFilteredRowModel().rows.length}명
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkActionsOpen(true)}>
                일괄 작업
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.toggleAllPageRowsSelected(false)}
              >
                선택 해제
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-md border overflow-hidden"
      >
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, idx) => (
                <motion.tr
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    'border-b border-border last:border-0'
                  )}
                  onClick={() => router.push(`/students/${row.original.id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: idx * 0.02,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-2 w-2 rounded-full bg-primary"
                            animate={{
                              y: [0, -10, 0],
                              opacity: [0.4, 1, 0.4],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        학생 목록을 불러오는 중...
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center text-muted-foreground"
                    >
                      <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>등록된 학생이 없습니다.</p>
                    </motion.div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex items-center justify-between px-2"
      >
        <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <>
              {table.getFilteredSelectedRowModel().rows.length}개 행 선택됨 /{' '}
            </>
          )}
          전체 {table.getFilteredRowModel().rows.length}개
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <label htmlFor="rows-per-page" className="text-sm font-medium">
              페이지당 행 수
            </label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="w-20" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            페이지 {table.getState().pagination.pageIndex + 1} /{' '}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">첫 페이지로</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">이전 페이지</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">다음 페이지</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">마지막 페이지로</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions Dialog */}
      <BulkActionsDialog
        open={bulkActionsOpen}
        onOpenChange={setBulkActionsOpen}
        selectedStudents={selectedStudents}
        onComplete={handleBulkActionsComplete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>학생 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 <span className="font-semibold text-foreground">{studentToDelete?.name}</span> 학생을 삭제하시겠습니까?
              <br />
              <br />
              이 작업은 되돌릴 수 없으며, 학생의 모든 정보가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (studentToDelete) {
                  onDelete?.(studentToDelete.id, studentToDelete.name)
                  setStudentToDelete(null)
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
