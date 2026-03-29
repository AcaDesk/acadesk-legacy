'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Label } from '@ui/label'
import { Alert, AlertDescription } from '@ui/alert'
import {
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  requestKakaoChannelToken,
  createKakaoChannel,
} from '@/app/actions/messaging/kakao-channel'
import { translateSolapiError } from '@/lib/solapi-error-translator'

// 학원/교육 카테고리 코드 (Solapi 고정값)
const ACADEMY_CATEGORY_CODE = '002'

interface KakaoChannelRegistrationProps {
  onRegistrationComplete?: () => void
  onOpenTemplateForm?: () => void
}

type Step = 1 | 2 | 3

const REGISTRATION_STEPS = ['채널 정보 입력', '인증 코드 입력', '완료']

export function KakaoChannelRegistration({
  onRegistrationComplete,
  onOpenTemplateForm,
}: KakaoChannelRegistrationProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [isLoading, setIsLoading] = useState(false)

  // Form data
  const [searchId, setSearchId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [token, setToken] = useState('')

  // Validation warnings
  const [searchIdWarning, setSearchIdWarning] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Search ID 입력 핸들러
  function handleSearchIdChange(value: string) {
    setSearchId(value)
    const compact = value.trim().replace(/[\s\u200B-\u200D\uFEFF]/g, '')

    if (compact.includes('pf.kakao.com')) {
      setSearchIdWarning('채널 URL이 아닌 검색용 아이디(@...)를 입력해주세요')
      return
    }

    const withoutAt = compact.replace(/^@/, '')
    if (withoutAt.startsWith('_')) {
      setSearchIdWarning('_(언더바)로 시작하면 URL 식별자입니다. 검색용 아이디를 입력해주세요')
      return
    }

    if (withoutAt && !/^[가-힣a-z0-9._-]{2,15}$/.test(withoutAt)) {
      setSearchIdWarning('2~15자 이내 한글/영문 소문자/숫자 또는 ._- 만 입력할 수 있습니다')
      return
    }
    setSearchIdWarning(null)
  }

  // 전화번호 검증 핸들러
  function handlePhoneChange(value: string) {
    setPhoneNumber(value)
    const digitsOnly = value.replace(/-/g, '')
    if (value && digitsOnly.length > 0) {
      if (!digitsOnly.startsWith('010')) {
        setPhoneError('010으로 시작하는 번호를 입력해주세요')
      } else if (digitsOnly.length !== 11) {
        setPhoneError('11자리 번호를 입력해주세요')
      } else {
        setPhoneError(null)
      }
    } else {
      setPhoneError(null)
    }
  }

  // 검색 ID 정규화 함수
  function normalizeSearchId(value: string): string {
    const trimmed = value.trim()
    return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
  }

  // Step 1: Request token
  async function handleRequestToken() {
    if (!searchId.trim() || !phoneNumber.trim()) {
      toast({
        title: '입력 오류',
        description: '채널 검색 ID와 휴대폰 번호를 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // 전화번호 유효성 검사
    const digitsOnly = phoneNumber.replace(/-/g, '')
    if (!digitsOnly.startsWith('010') || digitsOnly.length !== 11) {
      toast({
        title: '입력 오류',
        description: '010으로 시작하는 11자리 전화번호를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Ensure searchId starts with @
    const normalizedSearchId = normalizeSearchId(searchId)

    setIsLoading(true)
    try {
      const result = await requestKakaoChannelToken({
        searchId: normalizedSearchId,
        phoneNumber: digitsOnly,
      })

      if (!result.success) {
        toast({
          title: '인증 메시지 발송 실패',
          description: result.error || '인증 메시지 발송에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '인증 메시지 발송',
        description: '카카오톡으로 인증 메시지가 발송되었습니다. 확인 후 인증 코드를 입력해주세요.',
      })

      setSearchId(normalizedSearchId)
      setSearchIdWarning(null)
      setStep(2)
    } catch (error) {
      toast({
        title: '인증 메시지 발송 실패',
        description: translateSolapiError(error),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Create channel with token
  async function handleCreateChannel() {
    if (!token.trim()) {
      toast({
        title: '입력 오류',
        description: '인증 코드를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await createKakaoChannel({
        searchId,
        phoneNumber: phoneNumber.replace(/-/g, ''),
        token: token.trim(),
        categoryCode: ACADEMY_CATEGORY_CODE,
      })

      if (!result.success) {
        toast({
          title: '채널 연동 실패',
          description: result.error || '채널 연동에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '채널 연동 완료',
        description: '카카오 비즈니스 채널이 성공적으로 연동되었습니다.',
      })

      setStep(3)
      router.refresh()
    } catch (error) {
      toast({
        title: '채널 연동 실패',
        description: translateSolapiError(error),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleComplete() {
    onRegistrationComplete?.()
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">카카오 알림톡 설정</CardTitle>
            <CardDescription>카카오 비즈니스 채널을 연동하여 알림톡을 발송하세요</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {REGISTRATION_STEPS.map((label, i) => {
              const s = i + 1
              const isComplete = step > s
              const isCurrent = step === s
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all',
                        isComplete && 'bg-primary text-primary-foreground shadow-sm',
                        isCurrent &&
                          'border-2 border-primary bg-background text-primary ring-2 ring-primary/20',
                        !isComplete && !isCurrent && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" /> : s}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] whitespace-nowrap',
                        isComplete && 'text-foreground font-medium',
                        isCurrent && 'text-primary font-semibold',
                        !isComplete && !isCurrent && 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {s < REGISTRATION_STEPS.length && (
                    <div
                      className={cn(
                        'mx-2 mb-5 h-0.5 w-16 md:w-24 transition-colors',
                        isComplete ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step 1: Channel Info */}
        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <p className="font-medium mb-1">연동 전 확인 플로우</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>카카오 비즈니스 채널 개설 및 활성 상태 확인</li>
                  <li>채널 관리자 휴대폰 번호(010...) 확인</li>
                  <li>채널 검색용 아이디 확인 (입력 시 @는 자동 처리)</li>
                  <li>Solapi API 설정 저장 및 테스트 메시지 인증 완료</li>
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href="https://center-pf.kakao.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
                  >
                    카카오 채널 관리자센터
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://docs.solapi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
                  >
                    Solapi 문서
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="https://docs.solapi.com/references/kakao"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
                  >
                    Solapi 카카오 가이드
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="searchId">채널 검색 ID *</Label>
                <Input
                  id="searchId"
                  type="text"
                  value={searchId}
                  onChange={(e) => handleSearchIdChange(e.target.value)}
                  placeholder="검색용 아이디 입력 (예: 아카데스크)"
                  className="mt-2"
                />
                {searchIdWarning ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {searchIdWarning}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    채널 검색용 아이디만 입력하세요. @는 자동으로 처리됩니다.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phoneNumber">대표자 휴대폰 번호 *</Label>
                <PhoneInput
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                  className="mt-2"
                />
                {phoneError ? (
                  <p className="text-xs text-destructive mt-1">{phoneError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    채널 관리자로 등록된 휴대폰 번호를 입력하세요
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleRequestToken} disabled={isLoading || !!phoneError || !!searchIdWarning || !searchId.trim() || !phoneNumber.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                인증 메시지 요청
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Verification */}
        {step === 2 && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900">
              <MessageCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">인증 메시지 발송 완료</p>
                <p>
                  <strong>{phoneNumber}</strong> 번호로 카카오톡 인증 메시지가 발송되었습니다.
                  메시지에 포함된 인증 코드를 입력해주세요.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="token">인증 코드 *</Label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="인증 코드 입력"
                  className="mt-2"
                />
              </div>

            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setToken('')
                setStep(1)
              }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
              <Button onClick={handleCreateChannel} disabled={isLoading || !token.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                채널 연동
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-8 w-8" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold">채널 연동 완료!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                카카오 비즈니스 채널이 성공적으로 연동되었습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                이제 알림톡 템플릿을 등록하고 메시지를 발송할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={() => {
                handleComplete()
                onOpenTemplateForm?.()
              }}>
                <FileText className="h-4 w-4 mr-2" />
                템플릿 등록하기
              </Button>
              <Button variant="outline" onClick={handleComplete}>
                완료
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
