/**
 * Loading Patterns Examples
 *
 * 이 파일은 Acadesk에서 사용하는 로딩 패턴의 실제 예시 코드를 모아놓은 파일입니다.
 * 필요에 따라 복사하여 사용하세요.
 *
 * 📖 상세 가이드: /docs/LOADING_STRATEGY_GUIDE.md
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Users,
  Save,
  Trash2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'

// ============================================================================
// 예시 1: Link를 사용한 페이지 탐색 (프리페칭)
// ============================================================================

interface Student {
  id: string
  name: string
  grade: string
  school: string
}

/**
 * 학생 목록 카드 (Link 사용)
 *
 * 사용자가 카드에 마우스를 올리면 자동으로 상세 페이지를 프리페칭합니다.
 * 클릭 시 즉시 페이지 전환됩니다.
 */
export function StudentListWithLink({ students }: { students: Student[] }) {
  return (
    <div className="space-y-2">
      {students.map((student) => (
        <Link
          key={student.id}
          href={`/students/${student.id}`}
          className="block p-4 rounded-lg hover:bg-muted transition-colors border"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                {student.grade} · {student.school}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )
}

// ============================================================================
// 예시 2: router.push를 사용한 폼 제출 (조건부 탐색)
// ============================================================================

interface StudentFormData {
  name: string
  grade: string
  school: string
}

/**
 * 학생 등록 폼 (router.push 사용)
 *
 * 1. 폼 제출 시 즉시 로딩 상태 표시
 * 2. 서버 액션 실행
 * 3. 성공 시 목록 페이지로 이동 (로딩 상태 유지)
 * 4. 실패 시 로딩 상태 해제
 */
export function StudentRegistrationFormExample() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true) // 🟢 1. 로딩 시작

    try {
      const formData = new FormData(e.currentTarget)
      const data: StudentFormData = {
        name: formData.get('name') as string,
        grade: formData.get('grade') as string,
        school: formData.get('school') as string,
      }

      // 🔄 2. 서버 액션 (시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 성공 시
      toast({
        title: '학생 등록 완료',
        description: `${data.name} 학생이 등록되었습니다.`,
      })

      // 🚀 3. 페이지 이동 (로딩 상태 유지)
      router.push('/students')
      // 주의: setIsSubmitting(false) 하지 않음!
      // router.push()로 페이지가 이동되면서 컴포넌트가 언마운트됩니다.
    } catch (error) {
      toast({
        title: '등록 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      })
      setIsSubmitting(false) // 🔴 실패 시에만 로딩 해제
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 등록</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              학생 이름 *
            </label>
            <Input
              id="name"
              name="name"
              placeholder="홍길동"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="grade" className="text-sm font-medium">
              학년 *
            </label>
            <Input
              id="grade"
              name="grade"
              placeholder="중1"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="school" className="text-sm font-medium">
              학교명 *
            </label>
            <Input
              id="school"
              name="school"
              placeholder="○○중학교"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2">
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="등록 중..."
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              학생 등록
            </LoadingButton>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.back()}
            >
              취소
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 예시 3: 삭제 버튼 with 토스트 로딩
// ============================================================================

/**
 * 학생 삭제 버튼 (토스트 + LoadingButton 조합)
 *
 * 1. 삭제 시작 시 로딩 토스트 표시
 * 2. 작업 완료 시 성공 토스트로 교체
 * 3. 목록 페이지로 이동
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StudentDeleteButtonExample({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    // 📢 즉시 피드백 - 로딩 토스트
    const { dismiss } = toast({
      title: '삭제 중...',
      duration: Infinity, // 작업 완료까지 유지
    })

    try {
      // 삭제 작업 (시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      dismiss() // 로딩 토스트 제거

      toast({
        title: '삭제 완료',
        description: `${studentName} 학생 정보가 삭제되었습니다.`,
      })

      router.push('/students')
    } catch (error) {
      dismiss()

      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      })

      setIsDeleting(false)
    }
  }

  return (
    <LoadingButton
      variant="destructive"
      loading={isDeleting}
      loadingText="삭제 중..."
      onClick={handleDelete}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      학생 삭제
    </LoadingButton>
  )
}

// ============================================================================
// 예시 4: 전체 화면 로딩 (복잡한 일괄 작업)
// ============================================================================

/**
 * 일괄 처리 버튼 (전체 화면 로딩)
 *
 * 시간이 오래 걸리는 작업에 사용합니다.
 * 작업 중에는 전체 화면 오버레이를 표시합니다.
 */
export function BulkProcessButtonExample({ selectedStudentIds }: { selectedStudentIds: string[] }) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleBulkProcess() {
    setIsProcessing(true)

    try {
      // 일괄 처리 작업 (시뮬레이션)
      await new Promise((resolve) => setTimeout(resolve, 3000))

      router.push('/students?success=bulk-process')
    } catch {
      setIsProcessing(false)
    }
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <div>
                <p className="text-lg font-medium">일괄 처리 중...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedStudentIds.length}명의 학생을 처리하고 있습니다
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                잠시만 기다려주세요
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Button
      onClick={handleBulkProcess}
      disabled={selectedStudentIds.length === 0}
    >
      <Users className="mr-2 h-4 w-4" />
      선택한 학생 일괄 처리 ({selectedStudentIds.length}명)
    </Button>
  )
}

// ============================================================================
// 예시 5: 새로고침 버튼 (아이콘 버튼)
// ============================================================================

/**
 * 새로고침 버튼 (LoadingButton with icon)
 *
 * 작은 아이콘 버튼에도 로딩 상태를 명확히 표시할 수 있습니다.
 */
export function RefreshButtonExample({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  async function handleRefresh() {
    setIsRefreshing(true)

    try {
      await onRefresh()

      toast({
        title: '새로고침 완료',
        description: '최신 데이터를 불러왔습니다.',
      })
    } catch {
      toast({
        title: '새로고침 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <LoadingButton
      size="icon"
      variant="ghost"
      loading={isRefreshing}
      onClick={handleRefresh}
      title="새로고침"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? '' : 'hover:rotate-180 transition-transform'}`} />
    </LoadingButton>
  )
}

// ============================================================================
// 예시 모음 컴포넌트 (스토리북 역할)
// ============================================================================

/**
 * 모든 로딩 패턴 예시를 한눈에 볼 수 있는 데모 페이지
 *
 * 개발 중에만 사용하세요.
 */
export function LoadingPatternsDemo() {
  const mockStudents: Student[] = [
    { id: '1', name: '김철수', grade: '중1', school: '○○중학교' },
    { id: '2', name: '이영희', grade: '중2', school: '△△중학교' },
    { id: '3', name: '박민수', grade: '중3', school: '□□중학교' },
  ]

  async function mockRefresh() {
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">로딩 패턴 예시 모음</h1>
        <p className="text-muted-foreground">
          Acadesk에서 사용하는 다양한 로딩 패턴의 실제 동작을 확인하세요.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Link를 사용한 탐색 (프리페칭)</h2>
        <p className="text-sm text-muted-foreground">
          마우스를 카드에 올리면 다음 페이지를 미리 불러옵니다.
        </p>
        <StudentListWithLink students={mockStudents} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. 폼 제출 (router.push)</h2>
        <p className="text-sm text-muted-foreground">
          제출 버튼을 누르면 로딩 상태를 유지한 채 페이지가 이동됩니다.
        </p>
        <StudentRegistrationFormExample />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. 삭제 버튼 (토스트 + 로딩)</h2>
        <p className="text-sm text-muted-foreground">
          삭제 중 토스트로 즉시 피드백을 제공합니다.
        </p>
        <StudentDeleteButtonExample studentId="1" studentName="김철수" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. 일괄 처리 (전체 화면 로딩)</h2>
        <p className="text-sm text-muted-foreground">
          시간이 오래 걸리는 작업에 전체 화면 로딩을 표시합니다.
        </p>
        <BulkProcessButtonExample selectedStudentIds={['1', '2', '3']} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. 새로고침 버튼</h2>
        <p className="text-sm text-muted-foreground">
          작은 아이콘 버튼에도 로딩 상태를 표시할 수 있습니다.
        </p>
        <RefreshButtonExample onRefresh={mockRefresh} />
      </section>
    </div>
  )
}
