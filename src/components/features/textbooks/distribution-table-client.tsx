'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers'
import { updateStudentTextbook } from '@/app/actions/textbooks'
import type { StudentMaster } from '@/app/actions/students/queries'
import { AssignTextbookDialog } from './assign-textbook-dialog'

type UsageStatus = 'in_use' | 'completed' | 'returned'

export type TextbookUsageRecord = {
  id: string
  source: 'assignment' | 'lending'
  date: string
  paid: boolean
  status: UsageStatus
  notes: string | null
  due_date: string | null
  students: {
    id: string
    name: string
    student_code: string | null
    grade: string | null
  } | null
}

const statusLabels: Record<UsageStatus, string> = {
  in_use: '사용 중',
  completed: '완료',
  returned: '반납',
}

export function DistributionTableClient({
  distributions: initialDistributions,
  textbookId,
  students,
}: {
  distributions: TextbookUsageRecord[]
  textbookId: string
  students: StudentMaster[]
}) {
  const router = useRouter()
  const [distributions, setDistributions] = useState(initialDistributions)
  const [updating, setUpdating] = useState<string | null>(null)

  async function togglePaid(id: string, currentPaid: boolean) {
    setUpdating(id)
    setDistributions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, paid: !currentPaid } : d))
    )
    const result = await updateStudentTextbook({ id, paid: !currentPaid })
    if (!result.success) {
      setDistributions((prev) =>
        prev.map((d) => (d.id === id ? { ...d, paid: currentPaid } : d))
      )
      showErrorToast(
        '결제 상태 변경 실패',
        new Error(result.error || '변경 실패'),
        'DistributionTableClient.togglePaid'
      )
    } else {
      showSuccessToast('결제 상태 변경', `결제 상태가 ${!currentPaid ? '완료' : '미완료'}로 변경되었습니다`)
    }
    setUpdating(null)
  }

  async function changeStatus(id: string, newStatus: UsageStatus) {
    const prev = distributions.find((d) => d.id === id)
    if (!prev || prev.status === newStatus) return
    setUpdating(id)
    setDistributions((prevList) =>
      prevList.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    )
    const result = await updateStudentTextbook({ id, status: newStatus })
    if (!result.success) {
      setDistributions((prevList) =>
        prevList.map((d) => (d.id === id ? { ...d, status: prev.status } : d))
      )
      showErrorToast(
        '상태 변경 실패',
        new Error(result.error || '변경 실패'),
        'DistributionTableClient.changeStatus'
      )
    } else {
      showSuccessToast('상태 변경', `상태가 ${statusLabels[newStatus]}로 변경되었습니다`)
    }
    setUpdating(null)
  }

  const header = (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>배부 현황</CardTitle>
          <CardDescription>
            {distributions.length > 0
              ? `총 ${distributions.length}명에게 배부/대출 중`
              : '이 교재를 보유 중인 학생 목록'}
          </CardDescription>
        </div>
        <AssignTextbookDialog
          textbookId={textbookId}
          students={students}
          onSuccess={() => router.refresh()}
        />
      </div>
    </CardHeader>
  )

  if (distributions.length === 0) {
    return (
      <Card>
        {header}
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            아직 이 교재를 배부받거나 대출 중인 학생이 없습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {header}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학생</TableHead>
              <TableHead>학년/반</TableHead>
              <TableHead>구분</TableHead>
              <TableHead>날짜</TableHead>
              <TableHead>결제</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>비고</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.map((dist) => {
              const isLending = dist.source === 'lending'
              return (
                <TableRow key={`${dist.source}-${dist.id}`}>
                  <TableCell className="font-medium">
                    {dist.students ? (
                      <Link
                        href={`/students/${dist.students.id}`}
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        {dist.students.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{dist.students?.grade || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={isLending ? 'secondary' : 'default'} className="text-xs">
                      {isLending ? '대출' : '배부'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(dist.date).toLocaleDateString('ko-KR')}
                      {isLending && dist.due_date && (
                        <div className="text-xs text-muted-foreground">
                          반납 예정: {new Date(dist.due_date).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isLending ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`paid-${dist.id}`}
                          checked={dist.paid}
                          onCheckedChange={() => togglePaid(dist.id, dist.paid)}
                          disabled={updating === dist.id}
                        />
                        <label
                          htmlFor={`paid-${dist.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {dist.paid ? '완료' : '미완료'}
                        </label>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isLending ? (
                      <Badge variant="outline" className="text-xs">대출중</Badge>
                    ) : (
                      <Select
                        value={dist.status}
                        onValueChange={(value) => changeStatus(dist.id, value as UsageStatus)}
                        disabled={updating === dist.id}
                      >
                        <SelectTrigger className="w-28 h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_use">사용 중</SelectItem>
                          <SelectItem value="completed">완료</SelectItem>
                          <SelectItem value="returned">반납</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dist.notes || '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
