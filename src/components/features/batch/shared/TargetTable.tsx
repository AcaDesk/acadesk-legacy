'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Checkbox } from '@ui/checkbox'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { BatchTarget } from '@/core/types/batch.types'

interface TargetTableProps {
  students: BatchTarget[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

const PAGE_SIZE = 20

export function TargetTable({ students, selectedIds, onSelectionChange }: TargetTableProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(students.length / PAGE_SIZE)
  const paged = useMemo(
    () => students.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [students, page]
  )

  const allPageSelected = paged.length > 0 && paged.every((s) => selectedIds.has(s.id))
  const somePageSelected = paged.some((s) => selectedIds.has(s.id))

  const handleSelectAll = () => {
    const next = new Set(selectedIds)
    if (allPageSelected) {
      paged.forEach((s) => next.delete(s.id))
    } else {
      paged.forEach((s) => next.add(s.id))
    }
    onSelectionChange(next)
  }

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead>이름</TableHead>
              <TableHead>학생코드</TableHead>
              <TableHead>학년</TableHead>
              <TableHead>반</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  조건에 맞는 학생이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((student) => (
                <TableRow
                  key={student.id}
                  className="cursor-pointer"
                  onClick={() => handleToggle(student.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(student.id)}
                      onCheckedChange={() => handleToggle(student.id)}
                      aria-label={`${student.name} 선택`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.student_code ?? '-'}</TableCell>
                  <TableCell>{student.grade ?? '-'}</TableCell>
                  <TableCell>{student.class_name ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {students.length}명 중 {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, students.length)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
