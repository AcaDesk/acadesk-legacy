import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit, Book } from 'lucide-react'
import { getTextbookById } from '@/app/actions/textbooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { DistributionTab } from '@/components/features/textbooks/distribution-tab'

type PageProps = {
  params: Promise<{ id: string }>
}

async function TextbookInfo({ id }: { id: string }) {
  const result = await getTextbookById(id, true)

  if (!result.success || !result.data) {
    notFound()
  }

  const textbook = result.data as any

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/textbooks">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{textbook.title}</h1>
              {textbook.is_active ? (
                <Badge>활성</Badge>
              ) : (
                <Badge variant="secondary">비활성</Badge>
              )}
            </div>
            <p className="mt-2 text-muted-foreground">
              {textbook.publisher && `${textbook.publisher} | `}
              {textbook.isbn && `ISBN: ${textbook.isbn}`}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/textbooks/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            수정
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>가격</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {textbook.price
                ? `${textbook.price.toLocaleString()}원`
                : '미정'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>단원 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {textbook.textbook_units?.length || 0}개
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>등록일</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(textbook.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="units" className="space-y-4">
        <TabsList>
          <TabsTrigger value="units">단원 목록</TabsTrigger>
          <TabsTrigger value="distribution">배부 현황</TabsTrigger>
          <TabsTrigger value="progress">진도 기록</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4">
          {textbook.textbook_units && textbook.textbook_units.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>단원 목록</CardTitle>
                <CardDescription>
                  총 {textbook.textbook_units.length}개의 단원
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">순서</TableHead>
                      <TableHead className="w-32">단원 코드</TableHead>
                      <TableHead>단원명</TableHead>
                      <TableHead className="w-32 text-right">
                        페이지 수
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {textbook.textbook_units.map((unit: any) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">
                          {unit.unit_order}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {unit.unit_code || '-'}
                        </TableCell>
                        <TableCell>{unit.unit_title}</TableCell>
                        <TableCell className="text-right">
                          {unit.total_pages || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Book className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">
                    등록된 단원이 없습니다
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    교재 수정 페이지에서 단원을 추가할 수 있습니다
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <DistributionTab textbookId={id} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>진도 기록</CardTitle>
              <CardDescription>최근 진도 기록</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                진도 기록 기능은 곧 추가될 예정입니다
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default async function TextbookDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<WidgetSkeleton variant="stats" />}>
      <TextbookInfo id={id} />
    </Suspense>
  )
}
