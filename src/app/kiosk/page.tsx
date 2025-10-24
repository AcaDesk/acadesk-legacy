'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { Checkbox } from '@ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Trophy, CheckCircle, Clock, AlertCircle, PartyPopper, LogOut, Loader2, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { getKioskSession, clearKioskSession } from '@/lib/kiosk-session'
import { getStudentTodosForToday, toggleTodoComplete, type StudentTodo } from '@/app/actions/kiosk'

export default function KioskPage() {
  // All Hooks must be called before any early returns
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [studentCode, setStudentCode] = useState<string>('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [todos, setTodos] = useState<StudentTodo[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  const router = useRouter()
  const { toast } = useToast()

  // 세션 체크
  useEffect(() => {
    const session = getKioskSession()

    if (!session) {
      // 세션이 없으면 로그인 페이지로 리다이렉트
      router.push('/kiosk/login')
      return
    }

    setStudentId(session.studentId)
    setStudentName(session.studentName)
    setStudentCode(session.studentCode)
    setTenantId(session.tenantId)
    setIsCheckingSession(false)
  }, [router])

  // TODO 로드
  useEffect(() => {
    if (studentId && !isCheckingSession) {
      loadTodos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, isCheckingSession])

  // Function definitions
  async function loadTodos() {
    if (!studentId || !tenantId) return

    try {
      const result = await getStudentTodosForToday(studentId, tenantId)

      if (!result.success) {
        console.error('TODO 로드 오류:', result.error)
        toast({
          title: '오류',
          description: result.error || 'TODO를 불러올 수 없습니다.',
          variant: 'destructive',
        })
        return
      }

      setTodos(result.todos || [])

      // Check if all todos are verified
      if (result.todos && result.todos.length > 0) {
        const allVerified = result.todos.every(t => t.verified_at !== null)
        if (allVerified) {
          setShowCelebration(true)
        }
      }
    } catch (error) {
      console.error('Error loading todos:', error)
    }
  }

  async function handleToggleTodo(todoId: string, currentStatus: boolean) {
    if (!studentId || !tenantId) return

    setLoading(true)

    try {
      const result = await toggleTodoComplete(todoId, studentId, tenantId, !!currentStatus)

      if (!result.success) {
        toast({
          title: '오류',
          description: result.error || '과제 상태를 변경할 수 없습니다.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: currentStatus ? '완료 취소' : '완료 체크',
        description: currentStatus ? '과제 완료가 취소되었습니다.' : '과제를 완료 체크했습니다!',
      })

      await loadTodos()
    } catch (error: unknown) {
      console.error('Error toggling todo:', error)
      const errorMessage = error instanceof Error ? error.message : '과제 상태를 변경하는 중 오류가 발생했습니다.'
      toast({
        title: '오류',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 로그아웃 처리
  const handleLogout = () => {
    clearKioskSession()
    toast({
      title: '로그아웃 완료',
      description: '안전하게 로그아웃되었습니다.',
    })
    router.push('/kiosk/login')
  }

  // Calculate progress
  const totalTodos = todos.length
  const completedTodos = todos.filter(t => t.completed_at).length
  const verifiedTodos = todos.filter(t => t.verified_at).length
  const progressPercentage = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0
  const allCompleted = totalTodos > 0 && completedTodos === totalTodos
  const allVerified = totalTodos > 0 && verifiedTodos === totalTodos

  // Get today's date
  const today = new Date()
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
  const dayOfWeek = weekdays[today.getDay()]

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.kioskMode;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="키오스크 모드" description="학생들이 직접 출석 체크와 과제 완료를 확인할 수 있는 키오스크 화면 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="키오스크 모드" reason="키오스크 시스템 업데이트가 진행 중입니다." />;
  }

  // 세션 체크 중
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">세션 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Celebration Screen */}
        <AnimatePresence>
          {showCelebration && allVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
            >
              <Card className="w-full max-w-2xl mx-4 border-primary/50 shadow-2xl">
                <CardContent className="p-12 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                  >
                    <PartyPopper className="h-24 w-24 mx-auto text-primary mb-6" />
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-bold mb-4"
                  >
                    🎉 축하합니다!
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl text-muted-foreground mb-8"
                  >
                    모든 과제가 검증되었습니다!
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-4"
                  >
                    <Badge variant="default" className="text-2xl px-8 py-4">
                      조기 퇴실 가능
                    </Badge>
                    <p className="text-muted-foreground">
                      오늘 정말 수고했어요! 선생님께 조기 퇴실 승인을 받으세요.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8"
                  >
                    <Button
                      size="lg"
                      onClick={() => setShowCelebration(false)}
                      className="gap-2"
                    >
                      <Trophy className="h-5 w-5" />
                      확인
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 학생 프로필 & 날짜 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  {/* 날짜 정보 */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{dateString} {dayOfWeek}</span>
                  </div>

                  {/* 학생 정보 */}
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-3xl font-bold">{studentName}님</h2>
                      <span className="text-lg font-mono text-muted-foreground">
                        {studentCode}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      오늘도 열심히 공부해요! 👋
                    </p>
                  </div>
                </div>

                {/* 로그아웃 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 학습 진행률 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">오늘의 학습 목표</h1>
                  <p className="text-muted-foreground mt-1">
                    {allCompleted
                      ? '✨ 모든 과제를 완료했어요!'
                      : `${totalTodos}개 중 ${completedTodos}개 완료`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-primary">
                    {Math.round(progressPercentage)}%
                  </div>
                  <p className="text-xs text-muted-foreground">진행률</p>
                </div>
              </div>

              <Progress value={progressPercentage} className="h-3" />

              {allCompleted && !allVerified && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">
                      선생님께 가서 과제 검증을 요청하세요!
                    </p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Todos List */}
        <div className="space-y-3">
          {todos.map((todo, index) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`transition-all ${
                  todo.verified_at
                    ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : todo.completed_at
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={!!todo.completed_at}
                      onCheckedChange={() =>
                        handleToggleTodo(todo.id, !!todo.completed_at)
                      }
                      disabled={loading || !!todo.verified_at}
                      className="mt-1"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p
                            className={`font-medium text-lg ${
                              todo.verified_at || todo.completed_at
                                ? 'line-through text-muted-foreground'
                                : ''
                            }`}
                          >
                            {todo.title}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {todo.subject && (
                              <Badge variant="secondary">{todo.subject}</Badge>
                            )}
                            {todo.estimated_duration_minutes && (
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {todo.estimated_duration_minutes}분
                              </Badge>
                            )}
                          </div>

                          {todo.notes && (
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                              <p className="text-yellow-800 dark:text-yellow-200">
                                💬 선생님 피드백: {todo.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {todo.verified_at && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            검증 완료
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {todos.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>오늘 배정된 과제가 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
