'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, Lock, LogIn, Loader2, Search, Settings, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'
import { getStudentsByTenant, authenticateKioskByNameAndPhone } from '@/app/actions/kiosk'
import { createKioskSession } from '@/lib/kiosk-session'

interface Student {
  id: string
  tenant_id: string
  student_code: string
  name: string
  grade: string | null
  profile_image_url: string | null
}

export default function KioskLoginPage() {
  const [step, setStep] = useState<'select' | 'pin'>('select')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // 테넌트 ID 확인 및 학생 목록 로드
  useEffect(() => {
    const loadStudents = async () => {
      const tenantId = localStorage.getItem('kiosk_tenant_id')

      if (!tenantId) {
        toast({
          title: '키오스크 설정 필요',
          description: '먼저 키오스크를 설정해주세요.',
          variant: 'destructive',
        })
        router.push('/kiosk/setup')
        return
      }

      setIsLoading(true)

      try {
        const result = await getStudentsByTenant(tenantId)

        if (!result.success || !result.students) {
          toast({
            title: '학생 목록 로드 실패',
            description: result.error || '학생 목록을 불러올 수 없습니다.',
            variant: 'destructive',
          })
          return
        }

        setStudents(result.students)
      } catch (error) {
        console.error('학생 목록 로드 오류:', error)
        toast({
          title: '오류',
          description: '학생 목록을 불러오는 중 문제가 발생했습니다.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadStudents()
  }, [router, toast])

  // 검색 필터링 및 중복 이름 감지
  const filteredStudents = useMemo(() => {
    const filtered = students.filter((student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // 중복 이름 감지
    const nameCount = new Map<string, number>()
    filtered.forEach((student) => {
      nameCount.set(student.name, (nameCount.get(student.name) || 0) + 1)
    })

    return filtered.map((student) => ({
      ...student,
      isDuplicate: (nameCount.get(student.name) || 0) > 1,
    }))
  }, [students, searchTerm])

  // 학생 선택
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    setStep('pin')
    setPin('')
  }

  // PIN 인증
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudent) return

    if (pin.length !== 4) {
      toast({
        title: '입력 오류',
        description: '4자리 숫자를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsAuthenticating(true)

    try {
      const result = await authenticateKioskByNameAndPhone(selectedStudent.id, pin)

      if (!result.success || !result.student) {
        toast({
          title: '인증 실패',
          description: result.error || '전화번호 뒷자리가 일치하지 않습니다.',
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
      console.error('키오스크 인증 오류:', error)
      toast({
        title: '오류',
        description: '인증 중 문제가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  // 뒤로 가기 (PIN → 학생 선택)
  const handleBack = () => {
    setStep('select')
    setSelectedStudent(null)
    setPin('')
  }

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">학생 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <UserCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">키오스크 로그인</h1>
              <p className="text-sm text-muted-foreground">
                {step === 'select' ? '이름을 선택하세요' : '전화번호 뒷자리를 입력하세요'}
              </p>
            </div>
          </motion.div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/kiosk/setup')}
          >
            <Settings className="h-4 w-4 mr-2" />
            설정
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: 학생 선택 */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* 검색 */}
              <Card className="mb-6 shadow-lg">
                <CardContent className="pt-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="이름으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-16 pl-14 text-xl"
                      autoFocus
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 학생 카드 그리드 */}
              {filteredStudents.length === 0 ? (
                <Card className="shadow-lg">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-xl text-muted-foreground">
                      {searchTerm ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {filteredStudents.map((student, index) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                        onClick={() => handleSelectStudent(student)}
                      >
                        <CardContent className="flex flex-col items-center p-6 text-center">
                          {/* 프로필 이미지 */}
                          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                            {student.profile_image_url ? (
                              <img
                                src={student.profile_image_url}
                                alt={student.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <UserCircle className="h-12 w-12 text-primary" />
                            )}
                          </div>

                          {/* 이름 */}
                          <h3 className="mb-1 text-2xl font-bold">
                            {student.name}
                            {student.isDuplicate && (
                              <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({student.student_code.slice(-3)})
                              </span>
                            )}
                          </h3>

                          {/* 학년 */}
                          {student.grade && (
                            <p className="text-sm text-muted-foreground">{student.grade}</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: PIN 입력 */}
          {step === 'pin' && selectedStudent && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-md"
            >
              <Card className="shadow-xl">
                <CardHeader className="space-y-4 text-center">
                  {/* 뒤로 가기 버튼 */}
                  <div className="flex justify-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      disabled={isAuthenticating}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      뒤로
                    </Button>
                  </div>

                  {/* 선택된 학생 정보 */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
                  >
                    {selectedStudent.profile_image_url ? (
                      <img
                        src={selectedStudent.profile_image_url}
                        alt={selectedStudent.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-14 w-14 text-primary" />
                    )}
                  </motion.div>

                  <CardTitle className="text-3xl">{selectedStudent.name}</CardTitle>
                  {selectedStudent.grade && (
                    <CardDescription className="text-base">{selectedStudent.grade}</CardDescription>
                  )}
                </CardHeader>

                <form onSubmit={handlePinSubmit}>
                  <CardContent className="space-y-6">
                    {/* PIN 입력 */}
                    <div className="space-y-3">
                      <Label htmlFor="pin" className="text-base">
                        부모님 전화번호 뒷자리 4자리
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="pin"
                          type="password"
                          placeholder="••••"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="h-20 pl-14 text-center text-4xl tracking-widest"
                          disabled={isAuthenticating}
                          maxLength={4}
                          autoFocus
                        />
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        전화번호를 모르면 기본 PIN <strong>1234</strong>를 입력하세요
                      </p>
                    </div>

                    {/* 로그인 버튼 */}
                    <Button
                      type="submit"
                      className="w-full gap-2 h-16 text-lg"
                      size="lg"
                      disabled={isAuthenticating || pin.length !== 4}
                    >
                      {isAuthenticating ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          인증 중...
                        </>
                      ) : (
                        <>
                          <LogIn className="h-6 w-6" />
                          로그인
                        </>
                      )}
                    </Button>
                  </CardContent>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 관리자 로그인 링크 */}
        <div className="mt-8 text-center">
          <Button
            variant="link"
            className="text-sm text-muted-foreground"
            onClick={() => router.push('/auth/login')}
          >
            관리자 로그인
          </Button>
        </div>
      </div>
    </div>
  )
}
