'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
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
  Eye,
  Download,
  Send,
  Trash2,
  Settings2,
  ChevronDown,
  ArrowUpDown,
  X,
  FileText,
} from 'lucide-react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { motion } from 'motion/react'

import { Button } from '@ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { EmptyState } from '@ui/empty-state'
import { cn } from '@/lib/utils'
import type { ReportWithStudent } from '@/core/types/report.types'

interface ReportTableImprovedProps {
  data: ReportWithStudent[]
  loading?: boolean
  onSendClick: (reportId: string, studentName: string) => void
  onDeleteClick: (reportId: string, studentName: string) => void
}

export function ReportTableImproved({
  data,
  loading = false,
  onSendClick,
  onDeleteClick,
}: ReportTableImprovedProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'generated_at', desc: true } // Default: 최신순
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  function getReportTypeBadge(type: string) {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      weekly: { label: '주간', variant: 'secondary' },
      monthly: { label: '월간', variant: 'default' },
      quarterly: { label: '분기', variant: 'outline' },
    }

    const config = types[type] || { label: type, variant: 'outline' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  function formatPeriod(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)

    return `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} ~ ${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`
  }

  const columns: ColumnDef<ReportWithStudent>[] = [
    {
      accessorKey: 'students',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            학생
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const student = row.original.students
        return (
          <div>
            <div className="font-medium">
              {student?.users?.name || '이름 없음'}
            </div>
            <div className="text-xs text-muted-foreground">
              {student?.student_code}
            </div>
          </div>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        const report = row.original
        const searchTerm = filterValue.toLowerCase()

        // Search in student name and student code
        return (
          report.students?.users?.name?.toLowerCase().includes(searchTerm) ||
          report.students?.student_code?.toLowerCase().includes(searchTerm) ||
          false
        )
      },
      sortingFn: (rowA, rowB) => {
        const nameA = rowA.original.students?.users?.name || ''
        const nameB = rowB.original.students?.users?.name || ''
        return nameA.localeCompare(nameB)
      },
      enableHiding: false,
    },
    {
      accessorKey: 'report_type',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            유형
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => getReportTypeBadge(row.getValue('report_type')),
    },
    {
      id: 'period',
      header: '기간',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {formatPeriod(row.original.period_start, row.original.period_end)}
        </div>
      ),
    },
    {
      id: 'attendance_rate',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            출석률
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const rate = row.original.content.attendance.rate
        return (
          <div className="text-center">
            <Badge
              variant={
                rate >= 90
                  ? 'default'
                  : rate >= 80
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {rate}%
            </Badge>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const rateA = rowA.original.content.attendance.rate
        const rateB = rowB.original.content.attendance.rate
        return rateA - rateB
      },
    },
    {
      id: 'avg_score',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            평균 점수
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const scoresWithData = row.original.content.scores.filter((s) => s.current !== null)
        const avgScore = scoresWithData.length > 0
          ? Math.round(
              scoresWithData.reduce((sum, s) => sum + (s.current || 0), 0) /
              scoresWithData.length
            )
          : 0

        return (
          <div className="text-center">
            <Badge
              variant={
                avgScore >= 90
                  ? 'default'
                  : avgScore >= 80
                  ? 'secondary'
                  : 'outline'
              }
            >
              {avgScore}점
            </Badge>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const getAvgScore = (report: ReportWithStudent) => {
          const scoresWithData = report.content.scores.filter((s) => s.current !== null)
          return scoresWithData.length > 0
            ? scoresWithData.reduce((sum, s) => sum + (s.current || 0), 0) / scoresWithData.length
            : 0
        }
        return getAvgScore(rowA.original) - getAvgScore(rowB.original)
      },
    },
    {
      accessorKey: 'generated_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            생성일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {format(new Date(row.getValue('generated_at')), 'yyyy-MM-dd')}
        </div>
      ),
    },
    {
      accessorKey: 'sent_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            전송일
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const sentAt = row.getValue('sent_at') as string | null
        return sentAt ? (
          <Badge variant="outline" className="text-xs">
            {format(new Date(sentAt), 'yyyy-MM-dd')}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">미전송</span>
        )
      },
    },
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => {
        const report = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/reports/${report.id}`)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="h-4 w-4" />
            </Button>
            {!report.sent_at && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onSendClick(report.id, report.students?.users?.name || '학생')
                }}
              >
                <Send className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteClick(report.id, report.students?.users?.name || '학생')
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  const searchValue = (table.getColumn('students')?.getFilterValue() as string) ?? ''

  return (
    <div className="w-full space-y-4">
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
              placeholder="이름, 학번으로 검색..."
              value={searchValue}
              onChange={(event) =>
                table.getColumn('students')?.setFilterValue(event.target.value)
              }
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => table.getColumn('students')?.setFilterValue('')}
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
                  report_type: '유형',
                  period: '기간',
                  attendance_rate: '출석률',
                  avg_score: '평균 점수',
                  generated_at: '생성일',
                  sent_at: '전송일',
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
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    'border-b border-border last:border-0'
                  )}
                  onClick={() => router.push(`/reports/${row.original.id}`)}
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
                        리포트 목록을 불러오는 중...
                      </span>
                    </motion.div>
                  ) : (
                    <div className="py-0">
                      <EmptyState
                        icon={FileText}
                        title={searchValue ? '검색 결과가 없습니다' : '생성된 리포트가 없습니다'}
                        description={
                          searchValue
                            ? '다른 검색어를 시도해보세요'
                            : '새로운 리포트를 생성하여 시작하세요'
                        }
                        variant="minimal"
                        action={
                          !searchValue ? (
                            <Button onClick={() => router.push('/reports/new')}>
                              리포트 생성하기
                            </Button>
                          ) : undefined
                        }
                      />
                    </div>
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
    </div>
  )
}
