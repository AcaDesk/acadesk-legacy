'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription } from '@ui/alert'
import { Badge } from '@ui/badge'
import { Loader2, Search, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { getPromotionCandidates, executePromotion } from '@/app/actions/students/promotion'
import { getStudentFilterOptions } from '@/app/actions/students'
import {
  buildPromotionPlans,
  groupByCategory,
  groupTransfersByCurrentSchool,
  type PromotionPlan,
  type PromotionCategory,
} from '@/lib/promotion-utils'
import { PromotionScanResult } from './promotion-scan-result'
import { PromotionSchoolAssignment } from './promotion-school-assignment'
import { PromotionReview } from './promotion-review'

type Step = 'scan' | 'configure' | 'review' | 'complete'

const STEPS: { key: Step; label: string }[] = [
  { key: 'scan', label: '스캔' },
  { key: 'configure', label: '학교 배정' },
  { key: 'review', label: '검토' },
  { key: 'complete', label: '완료' },
]

export function PromotionWizard() {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('scan')
  const [plans, setPlans] = useState<PromotionPlan[]>([])
  const [schools, setSchools] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ successCount: number; failCount: number } | null>(null)

  // 스캔
  const handleScan = useCallback(async () => {
    setIsScanning(true)
    try {
      const [candidateResult, filterResult] = await Promise.all([
        getPromotionCandidates(),
        getStudentFilterOptions(),
      ])

      if (!candidateResult.success || !candidateResult.data) {
        toast({ title: '스캔 실패', description: candidateResult.error || '학생 조회 실패', variant: 'destructive' })
        return
      }

      const builtPlans = buildPromotionPlans(candidateResult.data)
      setPlans(builtPlans)

      // 학교 목록 추출
      if (filterResult.success && filterResult.data) {
        setSchools(filterResult.data.schools || [])
      }

      // 학교 전환 학생이 없으면 configure 스킵
      const groups = groupByCategory(builtPlans)
      if (groups.school_transfer.length === 0) {
        setStep('review')
      } else {
        setStep('configure')
      }
    } catch {
      toast({ title: '오류 발생', description: '진급 스캔 중 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setIsScanning(false)
    }
  }, [toast])

  // 학교 배정
  const handleSchoolAssign = useCallback((currentSchool: string, newSchool: string) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.category !== 'school_transfer') return p
        const key = p.currentSchool || '학교 미입력'
        if (key !== currentSchool) return p
        return { ...p, nextSchool: newSchool }
      })
    )
  }, [])

  // 개별 토글
  const handleToggle = useCallback((studentId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.studentId === studentId ? { ...p, selected: !p.selected } : p))
    )
  }, [])

  // 카테고리별 전체 토글
  const handleToggleAll = useCallback((category: PromotionCategory, selected: boolean) => {
    setPlans((prev) =>
      prev.map((p) => (p.category === category ? { ...p, selected } : p))
    )
  }, [])

  // 실행
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
  }, [plans, toast])

  const selectedCount = plans.filter((p) => p.selected && p.nextGrade !== null).length
  const hasUnassignedTransfers = plans.some(
    (p) => p.category === 'school_transfer' && p.selected && !p.nextSchool
  )

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => (
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
            {idx < STEPS.length - 1 && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step: Scan */}
      {step === 'scan' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              진급 스캔
            </CardTitle>
            <CardDescription>
              등록된 학생의 현재 학년을 분석하여 진급 계획을 생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleScan} disabled={isScanning} size="lg">
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  스캔 중...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  진급 스캔 시작
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Configure (School Assignment) */}
      {step === 'configure' && (
        <>
          <PromotionScanResult plans={plans} />
          <Card>
            <CardHeader>
              <CardTitle>학교 배정</CardTitle>
              <CardDescription>
                초등학교 → 중학교, 중학교 → 고등학교로 전환되는 학생의 새 학교를 지정합니다.
              </CardDescription>
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
            <Button variant="outline" onClick={() => setStep('scan')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              다시 스캔
            </Button>
            <Button onClick={() => setStep('review')}>
              다음: 검토
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <>
          <PromotionScanResult plans={plans} />
          <PromotionReview
            plans={plans}
            onToggle={handleToggle}
            onToggleAll={handleToggleAll}
          />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => {
              const groups = groupByCategory(plans)
              setStep(groups.school_transfer.length > 0 ? 'configure' : 'scan')
            }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              이전
            </Button>
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

      {/* Step: Complete */}
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

            <Button onClick={() => {
              setStep('scan')
              setPlans([])
              setResult(null)
            }}>
              새로운 진급 처리
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
