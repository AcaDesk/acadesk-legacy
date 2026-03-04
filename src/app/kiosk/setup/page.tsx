'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MonitorPlay, LogIn, CheckCircle2, AlertCircle, Loader2, KeyRound, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'
import { createBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@ui/avatar'

interface TenantInfo {
  tenantId: string
  tenantName: string
  userName: string
  roleCode: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '원장',
  instructor: '강사',
  assistant: '조교',
  parent: '학부모',
  student: '학생',
}

export default function KioskSetupPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [status, setStatus] = useState<'loading' | 'ready' | 'no_session' | 'error'>('loading')
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedTenantId, setSavedTenantId] = useState<string | null>(null)

  // 관리자 종료 PIN 설정
  const [exitPin, setExitPin] = useState('')
  const [exitPinConfirm, setExitPinConfirm] = useState('')
  const [isSavingPin, setIsSavingPin] = useState(false)
  const [currentExitPin, setCurrentExitPin] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('kiosk_tenant_id')
    setSavedTenantId(stored)
    const storedPin = localStorage.getItem('kiosk_exit_pin')
    setCurrentExitPin(storedPin ?? '9999 (기본값)')
    loadSessionInfo()
  }, [])

  async function loadSessionInfo() {
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatus('no_session'); return }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id, role_code, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (userError || !userData?.tenant_id) { setStatus('error'); return }

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', userData.tenant_id)
        .maybeSingle()

      setTenantInfo({
        tenantId: userData.tenant_id,
        tenantName: tenantData?.name ?? '학원',
        userName: userData.name ?? '사용자',
        roleCode: userData.role_code ?? '',
      })
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  function handleSetup() {
    if (!tenantInfo) return
    setIsSaving(true)
    localStorage.setItem('kiosk_tenant_id', tenantInfo.tenantId)
    setSavedTenantId(tenantInfo.tenantId)
    setTimeout(() => {
      router.push('/kiosk/attendance')
    }, 600)
  }

  function handleSaveExitPin() {
    if (exitPin.length !== 4 || !/^\d{4}$/.test(exitPin)) {
      toast({ title: '오류', description: '4자리 숫자로 입력해주세요.', variant: 'destructive' })
      return
    }
    if (exitPin !== exitPinConfirm) {
      toast({ title: '오류', description: 'PIN이 일치하지 않습니다.', variant: 'destructive' })
      return
    }
    setIsSavingPin(true)
    localStorage.setItem('kiosk_exit_pin', exitPin)
    setCurrentExitPin(exitPin)
    setExitPin('')
    setExitPinConfirm('')
    setTimeout(() => {
      setIsSavingPin(false)
      toast({ title: '저장 완료', description: '관리자 종료 PIN이 변경되었습니다.' })
    }, 300)
  }

  // ── 로딩 ─────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>세션 확인 중...</span>
        </div>
      </div>
    )
  }

  // ── 로그인 없음 ───────────────────────────────────────────────────────────
  if (status === 'no_session') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MonitorPlay className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">키오스크 설정</CardTitle>
              <CardDescription>설정을 진행하려면 관리자 계정으로 로그인해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button size="lg" className="w-full gap-2" onClick={() => router.push('/login?redirectTo=/kiosk/setup')}>
                <LogIn className="h-5 w-5" />
                로그인하러 가기
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/kiosk/attendance')}>
                키오스크로 바로 가기
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ── 에러 ─────────────────────────────────────────────────────────────────
  if (status === 'error' || !tenantInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">사용자 정보를 불러올 수 없습니다.</p>
          <Button variant="outline" onClick={loadSessionInfo}>다시 시도</Button>
        </div>
      </div>
    )
  }

  // ── 메인 ─────────────────────────────────────────────────────────────────
  const isAlreadySet = savedTenantId === tenantInfo.tenantId
  const roleLabel = ROLE_LABELS[tenantInfo.roleCode] ?? tenantInfo.roleCode

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-4"
      >
        {/* ── 학원 설정 ── */}
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MonitorPlay className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">키오스크 설정</CardTitle>
            <CardDescription>이 기기에서 사용할 학원을 확인하세요</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* 로그인 사용자 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {tenantInfo.userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{tenantInfo.userName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>

            {/* 감지된 학원 */}
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">학원 자동 감지 완료</p>
                  <p className="text-base font-bold mt-0.5 text-green-800 dark:text-green-200">{tenantInfo.tenantName}</p>
                  <p className="text-xs font-mono text-green-600 dark:text-green-400 mt-1 truncate">{tenantInfo.tenantId}</p>
                </div>
              </div>
            </div>

            {isAlreadySet && (
              <p className="text-xs text-center text-muted-foreground">이미 이 학원으로 설정되어 있습니다</p>
            )}

            <div className="space-y-2">
              <Button size="lg" className="w-full gap-2" onClick={handleSetup} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <MonitorPlay className="h-5 w-5" />}
                {isSaving ? '설정 중...' : '이 학원으로 설정'}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/dashboard')} disabled={isSaving}>
                대시보드로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 관리자 종료 PIN 설정 ── */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">관리자 종료 PIN</CardTitle>
                <CardDescription>키오스크 종료 시 사용하는 4자리 PIN</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">현재 PIN</span>
              <span className="font-mono font-medium">
                {currentExitPin ? '●●●●' : '미설정 (기본: 9999)'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="exitPin">새 PIN (4자리)</Label>
                <Input
                  id="exitPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="새 PIN 입력"
                  value={exitPin}
                  onChange={(e) => setExitPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exitPinConfirm">PIN 확인</Label>
                <Input
                  id="exitPinConfirm"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN 재입력"
                  value={exitPinConfirm}
                  onChange={(e) => setExitPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveExitPin() }}
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleSaveExitPin}
                disabled={isSavingPin || exitPin.length !== 4 || exitPinConfirm.length !== 4}
              >
                {isSavingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                PIN 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
