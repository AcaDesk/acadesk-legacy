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
  RowSelectionState,
} from '@tanstack/react-table'
import { motion, AnimatePresence } from 'motion/react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import {
  Eye,
  Edit,
  Trash2,
  Search,
  X,
  Users,
  MoreHorizontal,
} from 'lucide-react'

import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Checkbox } from '@ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
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
import { getGuardianRelationshipLabel } from '@/lib/constants'
import { getGuardianDisplayLabel, getGuardianSecondaryLabel } from '@/lib/guardian-display'

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
  onBulkDelete?: (ids: string[]) => void
}

export function GuardianTableImproved({
  data,
  loading,
  onDelete,
  onBulkDelete,
}: GuardianTableImprovedProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const selectedIds = React.useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key])
  }, [rowSelection])

  const columns: ColumnDef<Guardian>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="전체 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="행 선택"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: '학부모',
      cell: ({ row }) => {
        const guardian = row.original
        const studentNames = (guardian.guardian_students || [])
          .map((gs) => gs.students?.users?.name || '')
          .filter(Boolean)
        const displayLabel = getGuardianDisplayLabel(guardian.users?.name, studentNames)
        const secondary = getGuardianSecondaryLabel(guardian.users?.name, studentNames)
        return (
          <div>
            <div className="font-medium">{displayLabel}</div>
            {secondary && (
              <div className="text-xs text-muted-foreground mt-0.5">
                본명: {secondary}
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
            const relation = getGuardianRelationshipLabel(gs.relationship)
            return [`${studentName} ${relation}`, `${studentName}${relation}`, `${studentName} 보호자`]
          }),
        ].join(' ').toLowerCase()

        return searchableText.includes(value.toLowerCase())
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
      cell: ({ row }) => {
        const guardian = row.original
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
                  router.push(`/guardians/${guardian.id}`)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                상세 보기
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/guardians/${guardian.id}/edit`)
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
                  const studentNames = (guardian.guardian_students || [])
                    .map((gs) => gs.students?.users?.name || '')
                    .filter(Boolean)
                  onDelete(
                    guardian.id,
                    getGuardianDisplayLabel(guardian.users?.name, studentNames),
                  )
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
    data,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const guardian = row.original
      const searchableText = [
        guardian.users?.name || '',
        guardian.users?.phone || '',
        guardian.users?.email || '',
        ...(guardian.guardian_students || []).flatMap((gs) => {
          const studentName = gs.students?.users?.name || ''
          const relation = getGuardianRelationshipLabel(gs.relationship)
          return [`${studentName} ${relation}`, `${studentName}${relation}`]
        }),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(filterValue.toLowerCase())
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // 데이터가 변경되면 페이지 조정 (삭제 후 빈 페이지 방지)
  React.useEffect(() => {
    const pageCount = table.getPageCount()
    const currentPage = table.getState().pagination.pageIndex
    if (pageCount > 0 && currentPage >= pageCount) {
      table.setPageIndex(pageCount - 1)
    }
  }, [data, table])

  // 데이터가 변경되면 선택 초기화
  React.useEffect(() => {
    setRowSelection({})
  }, [data])

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

      {/* Floating Action Bar for Bulk Actions */}
      <AnimatePresence>
        {selectedIds.length > 0 && onBulkDelete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
          >
            <span className="text-sm font-medium">
              {selectedIds.length}명 선택됨
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onBulkDelete(selectedIds)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              일괄 삭제
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              선택 해제
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-md border overflow-hidden"
      >
        <Table>
          <TableHeader className="bg-muted/50">
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
          {table.getFilteredRowModel().rows.length > 0
            ? table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
              1
            : 0}
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
