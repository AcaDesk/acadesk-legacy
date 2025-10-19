'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserCircle, Lock, LogIn, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { authenticateKioskPin } from '@/app/actions/kiosk'
import { createKioskSession } from '@/lib/kiosk-session'

export default function KioskLoginPage() {
  const [studentCode, setStudentCode] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!studentCode.trim() || !pin.trim()) {
      toast({
        title: '입력 오류',
        description: '학생 코드와 PIN을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await authenticateKioskPin(studentCode, pin)

      if (!result.success || !result.student) {
        toast({
          title: '로그인 실패',
          description: result.error || '학생 코드 또는 PIN이 일치하지 않습니다.',
          variant: 'destructive',
        })
        setPin('')
        return
      }

      // 세션 생성
      createKioskSession(result.student)

      toast({
        title: '로그인 성공',
        description: `${result.student.name}님, 환영합니다!`,
      })

      // 키오스크 페이지로 이동
      router.push('/kiosk')
    } catch (error) {
      console.error('키오스크 로그인 오류:', error)
      toast({
        title: '오류',
        description: '로그인 중 문제가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
              <UserCircle className="h-8 w-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl">키오스크 로그인</CardTitle>
            <CardDescription>
              학생 코드와 PIN을 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {/* 학생 코드 입력 */}
              <div className="space-y-2">
                <Label htmlFor="studentCode">학생 코드</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="studentCode"
                    type="text"
                    placeholder="예: S2501001"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  학생 코드는 선생님께 문의하세요
                </p>
              </div>

              {/* PIN 입력 */}
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4자리)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="pl-10 text-center text-2xl tracking-widest"
                    disabled={isLoading}
                    maxLength={4}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  4자리 숫자 PIN을 입력하세요
                </p>
              </div>

              {/* 로그인 버튼 */}
              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isLoading || studentCode.length === 0 || pin.length !== 4}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    로그인
                  </>
                )}
              </Button>

              {/* 도움말 */}
              <div className="mt-6 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-medium">💡 도움말</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• 학생 코드는 등록 시 발급받은 고유 코드입니다</li>
                  <li>• PIN은 선생님이 설정한 4자리 숫자입니다</li>
                  <li>• 학생 코드 또는 PIN을 모르면 선생님께 문의하세요</li>
                </ul>
              </div>
            </CardContent>
          </form>
        </Card>

        {/* 관리자 로그인 링크 */}
        <div className="mt-4 text-center">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={() => router.push('/auth/login')}
          >
            관리자 로그인
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
