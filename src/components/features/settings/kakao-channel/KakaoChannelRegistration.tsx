'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Label } from '@ui/label'
import { Alert, AlertDescription } from '@ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  requestKakaoChannelToken,
  createKakaoChannel,
  getKakaoChannelCategories,
} from '@/app/actions/kakao-channel'
import type { KakaoChannelCategory } from '@/infra/messaging/types/kakao.types'

interface KakaoChannelRegistrationProps {
  onRegistrationComplete?: () => void
}

type Step = 1 | 2 | 3

export function KakaoChannelRegistration({ onRegistrationComplete }: KakaoChannelRegistrationProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<KakaoChannelCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Form data
  const [searchId, setSearchId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [token, setToken] = useState('')
  const [categoryCode, setCategoryCode] = useState('')

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true)
      try {
        const result = await getKakaoChannelCategories()
        if (result.success && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }
    loadCategories()
  }, [])

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

    // Ensure searchId starts with @
    const normalizedSearchId = searchId.startsWith('@') ? searchId : `@${searchId}`

    setIsLoading(true)
    try {
      const result = await requestKakaoChannelToken({
        searchId: normalizedSearchId,
        phoneNumber: phoneNumber.replace(/-/g, ''),
      })

      if (!result.success) {
        throw new Error(result.error || '토큰 요청 실패')
      }

      toast({
        title: '인증 메시지 발송',
        description: '카카오톡으로 인증 메시지가 발송되었습니다. 확인 후 인증 코드를 입력해주세요.',
      })

      setSearchId(normalizedSearchId)
      setStep(2)
    } catch (error) {
      toast({
        title: '토큰 요청 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Create channel with token
  async function handleCreateChannel() {
    if (!token.trim() || !categoryCode) {
      toast({
        title: '입력 오류',
        description: '인증 코드와 카테고리를 모두 입력해주세요.',
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
        categoryCode,
      })

      if (!result.success) {
        throw new Error(result.error || '채널 연동 실패')
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
        description: error instanceof Error ? error.message : '알 수 없는 오류',
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
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    step >= s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`mx-2 h-0.5 w-16 md:w-24 transition-colors ${
                      step > s ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>채널 정보 입력</span>
            <span>인증 코드 입력</span>
            <span>완료</span>
          </div>
        </div>

        {/* Step 1: Channel Info */}
        {step === 1 && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <p className="font-medium mb-1">사전 준비 사항</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>카카오 비즈니스 채널이 개설되어 있어야 합니다</li>
                  <li>채널 관리자로 등록된 휴대폰 번호가 필요합니다</li>
                  <li>Solapi API 설정이 완료되어 있어야 합니다</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="searchId">채널 검색 ID *</Label>
                <Input
                  id="searchId"
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="@channelname"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  카카오톡 채널 검색 ID를 입력하세요 (@ 포함)
                </p>
              </div>

              <div>
                <Label htmlFor="phoneNumber">대표자 휴대폰 번호 *</Label>
                <PhoneInput
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="010-0000-0000"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  채널 관리자로 등록된 휴대폰 번호를 입력하세요
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleRequestToken} disabled={isLoading}>
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

              <div>
                <Label htmlFor="category">채널 카테고리 *</Label>
                <Select value={categoryCode} onValueChange={setCategoryCode}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCategories ? (
                      <SelectItem value="loading" disabled>
                        로딩 중...
                      </SelectItem>
                    ) : categories.length === 0 ? (
                      <SelectItem value="none" disabled>
                        카테고리 없음
                      </SelectItem>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  채널의 업종 카테고리를 선택하세요
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                이전
              </Button>
              <Button onClick={handleCreateChannel} disabled={isLoading}>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
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

            <Button onClick={handleComplete}>
              완료
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
