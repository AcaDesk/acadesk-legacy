'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription } from '@ui/alert'
import { Badge } from '@ui/badge'
import { Loader2, ArrowRight, ArrowLeft, CheckCircle, RefreshCw, Inbox } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { getPromotionCandidates, executePromotion } from '@/app/actions/students/promotion'
import { getStudentFilterOptions } from '@/app/actions/students'
import {
  buildPromotionPlans,
  groupByCategory,
  type PromotionPlan,
  type PromotionCategory,
} from '@/lib/promotion-utils'

const PromotionScanResult = dynamic(
  () => import('./promotion-scan-result').then((mod) => mod.PromotionScanResult),
  { loading: () => <div className="h-32 animate-pulse rounded-lg bg-muted" /> }
)

const PromotionSchoolAssignment = dynamic(
  () => import('./promotion-school-assignment').then((mod) => mod.PromotionSchoolAssignment),
  { loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted" /> }
)

const PromotionReview = dynamic(
  () => import('./promotion-review').then((mod) => mod.PromotionReview),
  { loading: () => <div className="h-72 animate-pulse rounded-lg bg-muted" /> }
)

type Step = 'loading' | 'empty' | 'configure' | 'review' | 'complete'

const VISIBLE_STEPS: { key: Extract<Step, 'configure' | 'review' | 'complete'>; label: string }[] = [
  { key: 'configure', label: '학교 배정' },
  { key: 'review', label: '검토' },
  { key: 'complete', label: '완료' },
]

interface PromotionWizardProps {
  onClose?: () => void
  onCompleted?: () => void
}

export function PromotionWizard({ onClose, onCompleted }: PromotionWizardProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('loading')
  const [plans, setPlans] = useState<PromotionPlan[]>([])
  const [schools, setSchools] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ successCount: number; failCount: number } | null>(null)

  const handleScan = useCallback(async () => {
    setIsScanning(true)
    setStep('loading')
    setResult(null)
    try {
      const [candidateResult, filterResult] = await Promise.all([
        getPromotionCandidates(),
        getStudentFilterOptions(),
      ])

      if (!candidateResult.success || !candidateResult.data) {
        toast({ title: '스캔 실패', description: candidateResult.error || '학생 조회 실패', variant: 'destructive' })
        setStep('empty')
        return
      }

      const builtPlans = buildPromotionPlans(candidateResult.data)
      setPlans(builtPlans)

      if (filterResult.success && filterResult.data) {
        setSchools(filterResult.data.schools || [])
      }

      if (builtPlans.length === 0) {
        setStep('empty')
        return
      }

      const groups = groupByCategory(builtPlans)
      if (groups.school_transfer.length === 0) {
        setStep('review')
      } else {
        setStep('configure')
      }
    } catch {
      toast({ title: '오류 발생', description: '진급 스캔 중 오류가 발생했습니다.', variant: 'destructive' })
      setStep('empty')
    } finally {
      setIsScanning(false)
    }
  }, [toast])

  // 마운트 시 자동 스캔
  useEffect(() => {
    handleScan()
  }, [handleScan])

  const handleSchoolAssign = useCallback((studentId: string, newSchool: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.studentId === studentId ? { ...p, nextSchool: newSchool } : p))
    )
  }, [])

  const handleToggle = useCallback((studentId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.studentId === studentId ? { ...p, selected: !p.selected } : p))
    )
  }, [])

  const handleToggleAll = useCallback((category: PromotionCategory, selected: boolean) => {
    setPlans((prev) =>
      prev.map((p) => (p.category === category ? { ...p, selected } : p))
    )
  }, [])

  const handleExecute = useCallback(async () => {
    setIsExecuting(true)
    try {
      const selectedPlans = plans.filter((p) => p.selected && p.nextGrade !== null)

      if (selectedPlans.length === 0) {
        toast({ title: '선택된 학생이 없습니다', variant: 'destructive' })
        return
      }

      const batchId = crypto.randomUUID()
      const changes = selectedPlans.map((p) => ({
        studentId: p.studentId,
        studentName: p.studentName,
        currentGrade: p.currentGrade,
        nextGrade: p.nextGrade,
        currentSchool: p.currentSchool,
        nextSchool: p.nextSchool,
        category: p.category,
      }))

      const res = await executePromotion(changes, batchId)

      if (!res.success || !res.data) {
        toast({ title: '진급 처리 실패', description: res.error || '오류가 발생했습니다.', variant: 'destructive' })
        return
      }

      setResult({ successCount: res.data.successCount, failCount: res.data.failCount })
      setStep('complete')
      onCompleted?.()

      toast({
        title: '진급 처리 완료',
        description: `${res.data.successCount}명 성공${res.data.failCount > 0 ? `, ${res.data.failCount}명 실패` : ''}`,
      })
    } catch {
      toast({ title: '오류 발생', description: '진급 처리 중 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setIsExecuting(false)
      setConfirmOpen(false)
    }
  }, [plans, toast, onCompleted])

  const selectedCount = plans.filter((p) => p.selected && p.nextGrade !== null).length
  const hasUnassignedTransfers = plans.some(
    (p) => p.category === 'school_transfer' && p.selected && !p.nextSchool
  )

  const currentStepIndex = VISIBLE_STEPS.findIndex((s) => s.key === step)
  const showStepIndicator = currentStepIndex >= 0

  return (
    <div className="space-y-6">
      {showStepIndicator && (
        <div className="flex items-center gap-2">
          {VISIBLE_STEPS.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                idx === currentStepIndex
                  ? 'bg-primary text-primary-foreground'
                  : idx < currentStepIndex
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                <span>{idx + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < VISIBLE_STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">학생을 분석하는 중입니다...</p>
        </div>
      )}

      {step === 'empty' && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">진급 대상 학생이 없습니다</h3>
            <p className="text-sm text-muted-foreground">
              모든 학생이 이미 최고 학년이거나 진급할 대상이 없습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleScan} disabled={isScanning}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 스캔
            </Button>
            {onClose && (
              <Button onClick={onClose}>닫기</Button>
            )}
          </div>
        </div>
      )}

      {step === 'configure' && (
        <>
          <PromotionScanResult plans={plans} />
          <Card>
            <CardHeader>
              <CardTitle>학교 배정</CardTitle>
            </CardHeader>
            <CardContent>
              <PromotionSchoolAssignment
                plans={plans}
                schools={schools}
                onSchoolAssign={handleSchoolAssign}
              />
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleScan} disabled={isScanning}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 스캔
            </Button>
            <Button onClick={() => setStep('review')}>
              다음: 검토
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <PromotionScanResult plans={plans} />
          <PromotionReview
            plans={plans}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
          />
          <div className="flex justify-between">
            {groupByCategory(plans).school_transfer.length > 0 ? (
              <Button variant="outline" onClick={() => setStep('configure')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                이전
              </Button>
            ) : (
              <Button variant="outline" onClick={handleScan} disabled={isScanning}>
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 스캔
              </Button>
            )}
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={selectedCount === 0 || hasUnassignedTransfers}
            >
              진급 처리 ({selectedCount}명)
            </Button>
          </div>

          <ConfirmationDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`${selectedCount}명의 학생을 진급 처리하시겠습니까?`}
            description="학년과 학교 정보가 일괄 변경되며, 변경 이력이 기록됩니다."
            confirmText="진급 처리"
            isLoading={isExecuting}
            onConfirm={handleExecute}
          />
        </>
      )}

      {step === 'complete' && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              진급 처리 완료
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default">{result.successCount}명</Badge>
                <span className="text-sm">성공</span>
              </div>
              {result.failCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{result.failCount}명</Badge>
                  <span className="text-sm">실패</span>
                </div>
              )}
            </div>

            {result.failCount > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  일부 학생의 진급 처리에 실패했습니다. 학생 목록에서 확인 후 수동으로 수정해주세요.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleScan}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로운 진급 처리
              </Button>
              {onClose && (
                <Button onClick={onClose}>닫기</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
