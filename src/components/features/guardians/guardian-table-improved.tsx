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
import { motion, AnimatePresence } from 'motion/react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { Eye, Edit, Trash2, Search, X, Users } from 'lucide-react'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { cn, formatPhoneNumber } from '@/lib/utils'

export interface Guardian {
  id: string
  relationship: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  guardian_students: Array<{
    relationship: string
    is_primary: boolean
    students: {
      id: string
      student_code: string
      users: {
        name: string
      } | null
    } | null
  }>
}

interface GuardianTableImprovedProps {
  data: Guardian[]
  loading: boolean
  onDelete: (id: string, name: string) => void
}

const getRelationText = (relation: string): string => {
  const relationMap: Record<string, string> = {
    father: '아버지',
    mother: '어머니',
    grandfather: '할아버지',
    grandmother: '할머니',
    uncle: '삼촌',
    aunt: '이모/고모',
    other: '기타',
  }
  return relationMap[relation] || relation
}

export function GuardianTableImproved({
  data,
  loading,
  onDelete,
}: GuardianTableImprovedProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const columns: ColumnDef<Guardian>[] = [
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => {
        const guardian = row.original
        return (
          <div>
            <div className="font-medium">
              {guardian.users?.name || '이름 없음'}
            </div>
            {guardian.guardian_students && guardian.guardian_students.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {guardian.guardian_students.map((gs, idx) => {
                  const studentName = gs.students?.users?.name
                  const relation = gs.relationship
                  if (studentName && relation) {
                    return (
                      <span key={idx}>
                        {idx > 0 && ', '}
                        {studentName} {getRelationText(relation)}
                      </span>
                    )
                  }
                  return null
                })}
              </div>
            )}
          </div>
        )
      },
      filterFn: (row, id, value) => {
        const guardian = row.original
        const searchableText = [
          guardian.users?.name || '',
          guardian.users?.phone || '',
          guardian.users?.email || '',
          ...(guardian.guardian_students || []).flatMap(gs => {
            const studentName = gs.students?.users?.name || ''
            const relation = getRelationText(gs.relationship)
            return [`${studentName} ${relation}`, `${studentName}${relation}`]
          }),
        ].join(' ').toLowerCase()

        return searchableText.includes(value.toLowerCase())
      },
    },
    {
      accessorKey: 'relationship',
      header: '관계',
      cell: ({ row }) => {
        const guardian = row.original
        if (!guardian.guardian_students || guardian.guardian_students.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {guardian.guardian_students.map((gs, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {getRelationText(gs.relationship)}
                {gs.is_primary && <span className="ml-1">★</span>}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: '연락처',
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {formatPhoneNumber(row.original.users?.phone) || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'email',
      header: '이메일',
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {row.original.users?.email || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'students',
      header: '관련 학생',
      cell: ({ row }) => {
        const guardian = row.original
        if (!guardian.guardian_students || guardian.guardian_students.length === 0) {
          return <span className="text-muted-foreground text-sm">연결된 학생 없음</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {guardian.guardian_students.map((gs, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {gs.students?.users?.name || '학생'}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">작업</div>,
      cell: ({ row }) => {
        const guardian = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(`/guardians/${guardian.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(`/guardians/${guardian.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(guardian.id, guardian.users?.name || '보호자')}
            >
              <Trash2 className="h-4 w-4" />
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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'auto',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder='보호자 이름, "철수 어머니", 연락처로 검색...'
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-10"
          />
          <AnimatePresence>
            {globalFilter && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setGlobalFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5">
          전체 {table.getFilteredRowModel().rows.length}명
        </Badge>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-md border"
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">로딩 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/50',
                    'data-[state=selected]:bg-muted'
                  )}
                  data-state={row.getIsSelected() && 'selected'}
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
                  className="p-0"
                >
                  {globalFilter ? (
                    <NoSearchResultsEmptyState
                      searchTerm={globalFilter}
                      onClearSearch={() => setGlobalFilter('')}
                      icon={Search}
                    />
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="등록된 보호자가 없습니다"
                      description="새로운 보호자를 등록하여 시작하세요"
                      action={
                        <Button onClick={() => router.push('/guardians/new')}>
                          보호자 등록
                        </Button>
                      }
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex items-center justify-between px-2"
      >
        <div className="flex-1 text-sm text-muted-foreground">
          전체 {table.getFilteredRowModel().rows.length}명 중{' '}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}
          -
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}
          명 표시
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">페이지당 행 수</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
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
          <div className="flex items-center space-x-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              페이지 {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">첫 페이지</span>
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
                <span className="sr-only">마지막 페이지</span>
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
