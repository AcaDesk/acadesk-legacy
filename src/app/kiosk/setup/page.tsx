'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { MonitorPlay, LogIn, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@ui/avatar'
import { kioskStorage } from '@/lib/kiosk-storage'
import { provisionKioskDevice } from '@/app/actions/kiosk'

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

  const [status, setStatus] = useState<'loading' | 'ready' | 'no_session' | 'error'>('loading')
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedTenantId, setSavedTenantId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setSavedTenantId(kioskStorage.getTenantId())
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

  async function handleSetup() {
    if (!tenantInfo) return
    setIsSaving(true)
    setSaveError(null)

    // 서버에서 스태프 인증 후 서명된 디바이스 토큰 발급
    const result = await provisionKioskDevice()
    if (!result.success || !result.data) {
      setSaveError(result.error || '기기 등록에 실패했습니다. 다시 시도해주세요.')
      setIsSaving(false)
      return
    }

    kioskStorage.setTenantId(result.data.tenantId)
    kioskStorage.setDeviceToken(result.data.deviceToken)
    setSavedTenantId(result.data.tenantId)
    setTimeout(() => {
      router.push('/kiosk/attendance')
    }, 600)
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 flex items-center justify-center overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md py-8"
      >
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

            {saveError && (
              <p className="text-xs text-center text-destructive">{saveError}</p>
            )}

            <div className="space-y-2">
              <Button size="lg" className="w-full gap-2" onClick={handleSetup} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <MonitorPlay className="h-5 w-5" />}
                {isSaving ? '설정 중...' : '이 학원으로 설정'}
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => router.push('/settings/kiosk')} disabled={isSaving}>
                설정 페이지로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
