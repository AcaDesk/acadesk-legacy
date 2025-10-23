'use client'

import { useState, useEffect, useCallback } from 'react'
import { getClassesWithDetails } from '@/app/actions/classes'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import {
  GraduationCap,
  Plus,
  Users,
  Calendar,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { usePagination } from '@/hooks/use-pagination'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@ui/pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Input } from '@ui/input'

interface ClassData {
  id: string
  name: string
  description: string | null
  subject: string | null
  gradeLevel: string | null
  instructorName: string | null
  studentCount: number
  schedule: Record<string, unknown> | null
  room: string | null
  status: string
  active: boolean
  createdAt: string
}

// Schedule을 한글 문자열로 변환하는 헬퍼 함수
function formatSchedule(schedule: Record<string, unknown> | null): string {
  if (!schedule || typeof schedule !== 'object') return '-'

  // schedule 객체가 { day: string, time: string } 형태라고 가정
  const days = schedule.days as string[] | undefined
  const time = schedule.time as string | undefined

  if (days && time) {
    const dayMap: Record<string, string> = {
      'monday': '월',
      'tuesday': '화',
      'wednesday': '수',
      'thursday': '목',
      'friday': '금',
      'saturday': '토',
      'sunday': '일',
    }
    const koreanDays = days.map(d => dayMap[d.toLowerCase()] || d).join('/')
    return `${koreanDays} ${time}`
  }

  return JSON.stringify(schedule)
}

export default function ClassesPage() {
  // All Hooks must be called before any early returns
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true)

      // Server Action을 통해 데이터 로드
      const result = await getClassesWithDetails()

      if (!result.success || !result.data) {
        throw new Error(result.error || '수업 목록을 불러올 수 없습니다')
      }

      setClasses(result.data)
    } catch (error) {
      console.error('Error loading classes:', error)
      toast({
        title: '데이터 로드 오류',
        description: '수업 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // useEffect must be called before any early returns
  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.instructorName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage,
  } = usePagination({
    data: filteredClasses,
    itemsPerPage: 6,
  })

  const activeClasses = filteredClasses.filter(c => c.status === 'active' && c.active)
  const totalStudents = activeClasses.reduce((sum, c) => sum + c.studentCount, 0)
  const avgStudentsPerClass = activeClasses.length > 0
    ? Math.round(totalStudents / activeClasses.length)
    : 0

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-12">로딩 중...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>수업 관리</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                학원의 모든 수업을 관리하고 운영하세요
              </p>
            </div>
            <Link href="/classes/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 수업 추가
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className={GRID_LAYOUTS.STATS}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                활성 수업
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeClasses.length}개</div>
              <p className="text-xs text-muted-foreground mt-1">
                현재 운영 중인 수업
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                총 수강생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalStudents}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                전체 수업 수강생
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                평균 수강생
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{avgStudentsPerClass}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                수업당 평균 인원
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex gap-4 items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="수업명, 과목, 강사로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            필터
          </Button>
        </motion.div>

        {/* Classes List */}
        {filteredClasses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 수업이 없습니다.</p>
                  <p className="text-sm mt-2">새 수업을 추가하여 시작하세요.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className={GRID_LAYOUTS.DUAL}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {paginatedData.map((cls, index) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card className={CARD_STYLES.INTERACTIVE}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          <Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>
                            {cls.status === 'active' ? '운영중' : '휴강'}
                          </Badge>
                        </div>
                        <CardDescription>{cls.description}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">과목:</span>
                          <span className="font-medium">{cls.subject || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">수강생:</span>
                          <span className="font-medium">{cls.studentCount}명</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">시간:</span>
                        <span className="font-medium">{formatSchedule(cls.schedule)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-sm">
                          <span className="text-muted-foreground">강사:</span>
                          <span className="ml-2 font-medium">{cls.instructorName || '-'}</span>
                        </div>
                        <Link href={`/classes/${cls.id}`}>
                          <Button variant="outline" size="sm">
                            상세보기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={previousPage}
                    className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => goToPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )
                  }
                  return null
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={nextPage}
                    className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
