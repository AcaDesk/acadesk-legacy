'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Book, Search } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/loading-state'
import { SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'

type Textbook = {
  id: string
  title: string
  publisher: string | null
  isbn: string | null
  price: number | null
  is_active: boolean
  textbook_units?: any[]
}

interface TextbooksClientProps {
  textbooks: Textbook[]
}

function TextbookListContent({
  textbooks,
  searchQuery,
}: {
  textbooks: Textbook[]
  searchQuery: string
}) {
  // Filter textbooks based on search query
  const filteredTextbooks = textbooks.filter((textbook) => {
    const query = searchQuery.toLowerCase()
    return (
      textbook.title.toLowerCase().includes(query) ||
      (textbook.publisher?.toLowerCase() || '').includes(query)
    )
  })

  if (textbooks.length === 0) {
    return (
      <EmptyState
        icon={<Book className="h-12 w-12" />}
        title="등록된 교재가 없습니다"
        description="새 교재를 등록하여 진도 관리를 시작하세요"
        action={
          <Button asChild>
            <Link href="/textbooks/new">
              <Plus className="mr-2 h-4 w-4" />
              교재 등록
            </Link>
          </Button>
        }
      />
    )
  }

  if (filteredTextbooks.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-12 w-12" />}
        title="검색 결과가 없습니다"
        description={`"${searchQuery}"에 해당하는 교재를 찾을 수 없습니다`}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>교재 목록</CardTitle>
        <CardDescription>
          {searchQuery
            ? `${filteredTextbooks.length}개의 검색 결과`
            : `총 ${textbooks.length}개의 교재가 등록되어 있습니다`}
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
            {filteredTextbooks.map((textbook) => (
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

export function TextbooksClient({ textbooks }: TextbooksClientProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      {/* Search Bar */}
      <section
        aria-label="검색"
        className={PAGE_ANIMATIONS.firstSection}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="교재명 또는 출판사 검색..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Textbook List */}
      <section
        aria-label="교재 목록"
        {...PAGE_ANIMATIONS.getSection(1)}
      >
        <SectionErrorBoundary sectionName="교재 목록">
          <TextbookListContent
            textbooks={textbooks}
            searchQuery={searchQuery}
          />
        </SectionErrorBoundary>
      </section>
    </>
  )
}
