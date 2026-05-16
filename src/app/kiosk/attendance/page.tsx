'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check, LogIn, LogOut, Delete } from 'lucide-react'
import { Button } from '@ui/button'
import {
  lookupStudentsByPhone,
  recordKioskAttendance,
  type KioskStudentInfo,
  type KioskStudentStatus,
} from '@/app/actions/kiosk-attendance'
import { kioskStorage } from '@/lib/kiosk-storage'

type Step = 'setup_required' | 'input' | 'select' | 'confirm' | 'success' | 'admin_auth'

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function PinDots({ value, isAdmin = false }: { value: string; isAdmin?: boolean }) {
  return (
    <div className="flex gap-5 my-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full transition-all duration-150 ${
            i < value.length
              ? isAdmin
                ? 'bg-destructive scale-110'
                : 'bg-foreground scale-110'
              : 'bg-muted-foreground/25'
          }`}
        />
      ))}
    </div>
  )
}

function NumPad({
  compact = false,
  onDigit,
  onBackspace,
}: {
  compact?: boolean
  onDigit: (d: string) => void
  onBackspace: () => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
  const btnSize = compact ? 'h-14 w-14 text-xl' : 'h-20 w-20 text-3xl'

  return (
    <div className={`grid grid-cols-3 ${compact ? 'gap-2' : 'gap-3'}`}>
      {keys.map((key, idx) => {
        if (!key) return <div key={idx} />
        if (key === 'back') {
          return (
            <button
              key={key}
              onClick={onBackspace}
              className={`${btnSize} rounded-2xl font-semibold flex items-center justify-center bg-muted/60 hover:bg-muted active:scale-90 transition-all text-muted-foreground`}
            >
              <Delete className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            </button>
          )
        }
        return (
          <button
            key={key}
            onClick={() => onDigit(key)}
            className={`${btnSize} rounded-2xl font-semibold bg-muted/60 hover:bg-muted active:scale-90 transition-all select-none`}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: KioskStudentStatus }) {
  const config: Record<KioskStudentStatus, { label: string; className: string }> = {
    out: { label: '미등원', className: 'bg-muted text-muted-foreground' },
    in: {
      label: '등원 중',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    },
    done: {
      label: '하원 완료',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    },
  }
  const { label, className } = config[status]
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function KioskAttendancePage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('input')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<KioskStudentInfo[]>([])
  const [student, setStudent] = useState<KioskStudentInfo | null>(null)
  const [lastAction, setLastAction] = useState<'check_in' | 'check_out' | null>(null)
  const [successProgress, setSuccessProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const stored = kioskStorage.getTenantId()
    if (!stored) setStep('setup_required')
    else { setTenantId(stored); setStep('input') }
  }, [])

  useEffect(() => {
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current) }
  }, [])

  const resetToInput = useCallback(() => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null }
    setPhone('')
    setCandidates([])
    setStudent(null)
    setError(null)
    setLastAction(null)
    setSuccessProgress(0)
    setStep('input')
  }, [])

  const startSuccessTimer = useCallback(() => {
    setSuccessProgress(0)
    const start = Date.now()
    const duration = 3000
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min((elapsed / duration) * 100, 100)
      setSuccessProgress(progress)
      if (progress >= 100) {
        clearInterval(progressTimerRef.current!)
        progressTimerRef.current = null
        resetToInput()
      }
    }, 50)
  }, [resetToInput])

  async function handlePhoneSubmit(submittedPhone: string) {
    if (!tenantId) return
    setIsLoading(true)
    setError(null)

    const result = await lookupStudentsByPhone(tenantId, submittedPhone)
    setIsLoading(false)

    if (!result.success || !result.students) {
      setError(result.error ?? '일치하는 학생이 없습니다.')
      setPhone('')
      return
    }

    if (result.students.length === 1) {
      setStudent(result.students[0])
      setStep('confirm')
    } else {
      setCandidates(result.students)
      setStep('select')
    }
  }

  async function handleAttendance(action: 'check_in' | 'check_out') {
    if (!student || !tenantId) return
    setIsLoading(true)
    setError(null)

    const result = await recordKioskAttendance(student.id, tenantId, action)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error ?? '처리 중 오류가 발생했습니다.')
      return
    }

    setLastAction(action)
    setStep('success')
    startSuccessTimer()
  }

  function handleAdminPinSubmit(submittedPin: string) {
    const exitPin = kioskStorage.getExitPin()
    if (submittedPin === exitPin) {
      router.push('/dashboard')
    } else {
      setError('관리자 PIN이 올바르지 않습니다.')
      setAdminPin('')
    }
  }

  function handleDigit(digit: string) {
    if (step === 'input' && !isLoading) {
      if (phone.length >= 4) return
      const next = phone + digit
      setPhone(next)
      if (next.length === 4) handlePhoneSubmit(next)
    } else if (step === 'admin_auth') {
      if (adminPin.length >= 4) return
      const next = adminPin + digit
      setAdminPin(next)
      if (next.length === 4) handleAdminPinSubmit(next)
    }
  }

  function handleBackspace() {
    if (step === 'input') setPhone((p) => p.slice(0, -1))
    else if (step === 'admin_auth') setAdminPin((p) => p.slice(0, -1))
  }

  const timeString = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const dateString = currentTime.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  // ── setup_required ────────────────────────────────────────────────────────
  if (step === 'setup_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">키오스크 설정이 필요합니다</h1>
          <p className="text-muted-foreground">키오스크를 사용하려면 먼저 설정을 완료해주세요.</p>
          <Button size="lg" onClick={() => router.push('/kiosk/setup')}>설정하러 가기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* 관리자 종료 버튼 */}
      {step === 'input' && (
        <button
          onClick={() => { setAdminPin(''); setError(null); setStep('admin_auth') }}
          className="absolute top-5 right-5 p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="관리자 종료"
        >
          <X className="h-6 w-6" />
        </button>
      )}

      <AnimatePresence mode="wait">

        {/* ── INPUT ──────────────────────────────────────────────────────── */}
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs px-4"
          >
            <div className="text-center">
              <div className="text-6xl font-mono font-bold tabular-nums tracking-tight">{timeString}</div>
              <div className="text-muted-foreground mt-1 text-sm">{dateString}</div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">보호자 전화번호 뒷 4자리를<br />입력해주세요</h2>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p key={error} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-destructive text-sm whitespace-pre-line"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <PinDots value={phone} />

            {isLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground py-4">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>확인 중...</span>
              </div>
            ) : (
              <NumPad onDigit={handleDigit} onBackspace={handleBackspace} />
            )}
          </motion.div>
        )}

        {/* ── SELECT (형제자매 선택) ──────────────────────────────────────── */}
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6 w-full max-w-sm px-4"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold">본인을 선택해주세요</h2>
              <p className="text-sm text-muted-foreground mt-1">같은 번호로 등록된 학생이 여러 명입니다</p>
            </div>

            <div className="w-full space-y-3">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setStudent(c); setStep('confirm') }}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-muted/60 hover:bg-muted active:scale-98 transition-all text-left"
                >
                  <div>
                    <p className="text-xl font-bold">{c.name}</p>
                    {c.grade && <p className="text-sm text-muted-foreground">{c.grade}</p>}
                  </div>
                  <StatusBadge status={c.currentStatus} />
                </button>
              ))}
            </div>

            <Button variant="ghost" onClick={resetToInput} className="text-muted-foreground">
              취소
            </Button>
          </motion.div>
        )}

        {/* ── CONFIRM ────────────────────────────────────────────────────── */}
        {step === 'confirm' && student && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-7 w-full max-w-sm px-4"
          >
            <div className="h-28 w-28 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center text-5xl font-bold text-primary select-none">
              {student.name.charAt(0)}
            </div>

            <div className="text-center">
              <h2 className="text-4xl font-bold">{student.name}</h2>
              {student.grade && <p className="text-muted-foreground mt-1">{student.grade}</p>}
            </div>

            <StatusBadge status={student.currentStatus} />

            <AnimatePresence mode="wait">
              {error && (
                <motion.p key={error} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-destructive text-sm"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex gap-4">
              <Button
                size="lg" variant="outline" className="w-40 h-14 text-lg gap-2"
                disabled={isLoading || student.currentStatus === 'in' || student.currentStatus === 'done'}
                onClick={() => handleAttendance('check_in')}
              >
                {isLoading
                  ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <LogIn className="h-5 w-5" />}
                등원하기
              </Button>
              <Button
                size="lg" className="w-40 h-14 text-lg gap-2"
                disabled={isLoading || student.currentStatus === 'out' || student.currentStatus === 'done'}
                onClick={() => handleAttendance('check_out')}
              >
                {isLoading
                  ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <LogOut className="h-5 w-5" />}
                하원하기
              </Button>
            </div>

            <Button variant="ghost" onClick={resetToInput} className="text-muted-foreground">
              취소
            </Button>
          </motion.div>
        )}

        {/* ── SUCCESS ────────────────────────────────────────────────────── */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-6 w-full max-w-sm px-4"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.05 }}
              className="h-28 w-28 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <Check className="h-14 w-14 text-green-600 dark:text-green-400" strokeWidth={3} />
            </motion.div>

            <div className="text-center">
              <h2 className="text-3xl font-bold">
                {lastAction === 'check_in' ? '등원' : '하원'} 처리 완료
              </h2>
              <p className="text-muted-foreground mt-2">{student?.name}님, 수고하셨습니다!</p>
            </div>

            <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-none" style={{ width: `${successProgress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">잠시 후 자동으로 초기화됩니다</p>
          </motion.div>
        )}

        {/* ── ADMIN_AUTH ──────────────────────────────────────────────────── */}
        {step === 'admin_auth' && (
          <motion.div
            key="admin_auth"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-7 w-full max-w-xs px-4"
          >
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">관리자 PIN을 입력하세요</h2>
              <p className="text-sm text-muted-foreground">키오스크를 종료하려면 관리자 PIN이 필요합니다</p>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p key={error} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-destructive text-sm pt-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <PinDots value={adminPin} isAdmin />
            <NumPad compact onDigit={handleDigit} onBackspace={handleBackspace} />

            <Button variant="outline" onClick={() => { setAdminPin(''); setError(null); setStep('input') }}>
              돌아가기
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
