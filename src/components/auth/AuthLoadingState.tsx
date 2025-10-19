/**
 * 인증 단계 로딩 상태 컴포넌트
 *
 * 프로그레스 바와 단계별 애니메이션을 포함한 로딩 UI
 */

'use client'

import { motion } from 'framer-motion'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface AuthLoadingStateProps {
  /** 현재 단계 이름 */
  stage: string
  /** 진행 상태 메시지 */
  message?: string
  /** 진행률 (0-100) */
  progress?: number
  /** 아이콘 컴포넌트 */
  icon?: React.ReactNode
  /** 완료된 단계 목록 */
  completedSteps?: string[]
  /** 총 단계 수 */
  totalSteps?: number
}

export function AuthLoadingState({
  stage,
  message = '잠시만 기다려주세요...',
  progress,
  icon,
  completedSteps = [],
  totalSteps = 3,
}: AuthLoadingStateProps) {
  // 진행률 계산 (제공되지 않은 경우)
  const calculatedProgress = progress ?? (completedSteps.length / totalSteps) * 100

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* 아이콘 영역 */}
            <div className="text-center">
              <motion.div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {icon || <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              </motion.div>

              {/* 단계 이름 */}
              <h3 className="text-lg font-semibold">{stage}</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>

            {/* 프로그레스 바 */}
            <div className="space-y-2">
              <Progress value={calculatedProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(calculatedProgress)}% 완료
              </p>
            </div>

            {/* 완료된 단계 목록 */}
            {completedSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">완료된 단계</p>
                  <ul className="space-y-1.5">
                    {completedSteps.map((step, index) => (
                      <motion.li
                        key={step}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-muted-foreground">{step}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* 로딩 애니메이션 도트 */}
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 간단한 로딩 스피너 (기본 사용)
 */
export function SimpleAuthLoadingState({
  message = '처리 중...',
}: {
  message?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium">{message}</p>
              <p className="text-sm text-muted-foreground mt-2">잠시만 기다려주세요.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
