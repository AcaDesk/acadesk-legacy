'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Lock, Save, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'

const SETUP_PASSWORD = 'admin1234' // 관리자 비밀번호

export default function KioskSetupPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // 로컬스토리지에서 기존 설정 불러오기
  useEffect(() => {
    const savedTenantId = localStorage.getItem('kiosk_tenant_id')
    if (savedTenantId) {
      setTenantId(savedTenantId)
    }
  }, [isAuthenticated])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (password === SETUP_PASSWORD) {
      setIsAuthenticated(true)
      toast({
        title: '인증 성공',
        description: '관리자 권한이 확인되었습니다.',
      })
    } else {
      toast({
        title: '인증 실패',
        description: '비밀번호가 올바르지 않습니다.',
        variant: 'destructive',
      })
      setPassword('')
    }
  }

  const handleSaveSetup = () => {
    if (!tenantId.trim()) {
      toast({
        title: '입력 오류',
        description: '테넌트 ID를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // 로컬스토리지에 저장
      localStorage.setItem('kiosk_tenant_id', tenantId.trim())

      toast({
        title: '설정 저장 완료',
        description: '키오스크 단말기 설정이 저장되었습니다.',
      })

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/kiosk/login')
      }, 2000)
    } catch (error) {
      console.error('설정 저장 오류:', error)
      toast({
        title: '저장 실패',
        description: '설정을 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearSetup = () => {
    localStorage.removeItem('kiosk_tenant_id')
    setTenantId('')
    toast({
      title: '설정 초기화',
      description: '키오스크 설정이 초기화되었습니다.',
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl">
            <CardHeader className="space-y-2 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
              >
                <Lock className="h-8 w-8 text-primary" />
              </motion.div>
              <CardTitle className="text-2xl">관리자 인증</CardTitle>
              <CardDescription>
                키오스크 설정을 변경하려면 비밀번호를 입력하세요
              </CardDescription>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">관리자 비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full" size="lg">
                  <Lock className="h-5 w-5 mr-2" />
                  인증
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/kiosk/login')}
                >
                  취소
                </Button>
              </CardContent>
            </form>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">키오스크 단말기 설정</CardTitle>
                <CardDescription>
                  이 단말기가 사용할 학원(테넌트)을 설정하세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 테넌트 ID 입력 */}
            <div className="space-y-2">
              <Label htmlFor="tenantId">테넌트 ID</Label>
              <Input
                id="tenantId"
                type="text"
                placeholder="예: cf5ba30f-4081-494f-952f-45a7264a0c5d"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                학원의 고유 테넌트 ID를 입력하세요. 관리 페이지에서 확인할 수 있습니다.
              </p>
            </div>

            {/* 현재 설정 상태 */}
            {tenantId && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      현재 설정된 테넌트 ID
                    </p>
                    <p className="text-xs font-mono text-green-700 dark:text-green-300 mt-1">
                      {tenantId}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 안내 사항 */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium mb-2">📌 설정 안내</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• 이 설정은 현재 브라우저에만 저장됩니다</li>
                <li>• 한 번 설정하면 이 단말기에서 해당 학원의 학생만 로그인할 수 있습니다</li>
                <li>• 다른 학원으로 변경하려면 다시 이 페이지에 접속하세요</li>
                <li>• 브라우저 캐시를 지우면 설정이 초기화됩니다</li>
              </ul>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveSetup}
                disabled={isLoading || !tenantId.trim()}
                className="flex-1"
                size="lg"
              >
                <Save className="h-5 w-5 mr-2" />
                {isLoading ? '저장 중...' : '설정 저장'}
              </Button>

              <Button
                onClick={handleClearSetup}
                variant="outline"
                disabled={isLoading}
                size="lg"
              >
                초기화
              </Button>

              <Button
                onClick={() => router.push('/kiosk/login')}
                variant="outline"
                disabled={isLoading}
                size="lg"
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 하단 안내 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            설정이 완료되면 자동으로 로그인 페이지로 이동합니다
          </p>
        </div>
      </motion.div>
    </div>
  )
}
