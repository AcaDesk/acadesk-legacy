import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Book, Search } from 'lucide-react'
import { getTextbooks } from '@/app/actions/textbooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export const metadata = {
  title: '교재 관리',
  description: '교재 및 진도 관리',
}

async function TextbookListContent() {
  const result = await getTextbooks({ includeUnits: true })

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {result.error || '교재를 불러올 수 없습니다'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const textbooks = result.data

  if (textbooks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Book className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">등록된 교재가 없습니다</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              새 교재를 등록하여 진도 관리를 시작하세요
            </p>
            <Button asChild className="mt-4">
              <Link href="/textbooks/new">
                <Plus className="mr-2 h-4 w-4" />
                교재 등록
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>교재 목록</CardTitle>
        <CardDescription>
          총 {textbooks.length}개의 교재가 등록되어 있습니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>교재명</TableHead>
              <TableHead>출판사</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>단원 수</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {textbooks.map((textbook: any) => (
              <TableRow key={textbook.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/textbooks/${textbook.id}`}
                    className="hover:underline"
                  >
                    {textbook.title}
                  </Link>
                </TableCell>
                <TableCell>{textbook.publisher || '-'}</TableCell>
                <TableCell className="font-mono text-sm">
                  {textbook.isbn || '-'}
                </TableCell>
                <TableCell>
                  {textbook.price
                    ? `${textbook.price.toLocaleString()}원`
                    : '-'}
                </TableCell>
                <TableCell>
                  {textbook.textbook_units?.length || 0}개
                </TableCell>
                <TableCell>
                  {textbook.is_active ? (
                    <Badge variant="default">활성</Badge>
                  ) : (
                    <Badge variant="secondary">비활성</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/textbooks/${textbook.id}`}>상세</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function TextbooksPage() {
  return (
    <PageWrapper
      title="교재 관리"
      subtitle="교재를 등록하고 학생별 진도를 관리하세요"
      actions={
        <Button asChild>
          <Link href="/textbooks/new">
            <Plus className="mr-2 h-4 w-4" />
            교재 등록
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="교재명 또는 출판사 검색..."
            className="pl-10"
          />
        </div>
      </div>

      <Suspense fallback={<WidgetSkeleton variant="table" />}>
        <TextbookListContent />
      </Suspense>
      </div>
    </PageWrapper>
  )
}
