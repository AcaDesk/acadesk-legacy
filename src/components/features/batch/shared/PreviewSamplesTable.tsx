'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import type { BatchTarget } from '@/core/types/batch.types'

interface PreviewSamplesTableProps {
  samples: BatchTarget[]
}

export function PreviewSamplesTable({ samples }: PreviewSamplesTableProps) {
  if (samples.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">샘플 미리보기 (최대 5건)</h4>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>학생코드</TableHead>
              <TableHead>학년</TableHead>
              <TableHead>반</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.student_code ?? '-'}</TableCell>
                <TableCell>{s.grade ?? '-'}</TableCell>
                <TableCell>{s.class_name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
