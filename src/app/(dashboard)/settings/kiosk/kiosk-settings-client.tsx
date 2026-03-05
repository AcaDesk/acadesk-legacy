'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { useToast } from '@/hooks/use-toast'
import { MonitorPlay, KeyRound, Save, Loader2, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'

export function KioskSettingsClient() {
  const router = useRouter()
  const { toast } = useToast()

  const [savedTenantId, setSavedTenantId] = useState<string | null>(null)
  const [currentExitPin, setCurrentExitPin] = useState<string | null>(null)
  const [exitPin, setExitPin] = useState('')
  const [exitPinConfirm, setExitPinConfirm] = useState('')
  const [isSavingPin, setIsSavingPin] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSavedTenantId(localStorage.getItem('kiosk_tenant_id'))
    setCurrentExitPin(localStorage.getItem('kiosk_exit_pin'))
    setMounted(true)
  }, [])

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

  function handleResetKiosk() {
    localStorage.removeItem('kiosk_tenant_id')
    setSavedTenantId(null)
    toast({ title: '초기화 완료', description: '키오스크 기기 설정이 초기화되었습니다.' })
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-36 rounded-lg bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 기기 연결 상태 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <MonitorPlay className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>이 기기 키오스크 연결</CardTitle>
              <CardDescription>현재 기기의 키오스크 설정 상태</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">연결 상태</p>
              {savedTenantId ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">연결됨</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">미연결</span>
                </div>
              )}
              {savedTenantId && (
                <p className="text-xs font-mono text-muted-foreground">{savedTenantId}</p>
              )}
            </div>
            <Badge variant={savedTenantId ? 'default' : 'secondary'}>
              {savedTenantId ? '설정됨' : '미설정'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/kiosk/setup')}
            >
              <ExternalLink className="h-4 w-4" />
              키오스크 설정 페이지
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/kiosk/attendance')}
            >
              <MonitorPlay className="h-4 w-4" />
              키오스크 실행
            </Button>
            {savedTenantId && (
              <Button
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={handleResetKiosk}
              >
                기기 연결 초기화
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 관리자 종료 PIN */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>관리자 종료 PIN</CardTitle>
              <CardDescription>키오스크 종료 시 사용하는 4자리 PIN (기본값: 9999)</CardDescription>
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
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
            <Button
              className="gap-2"
              onClick={handleSaveExitPin}
              disabled={isSavingPin || exitPin.length !== 4 || exitPinConfirm.length !== 4}
            >
              {isSavingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              PIN 저장
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
