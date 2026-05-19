'use client'

import { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription } from '@ui/alert'
import { Switch } from '@ui/switch'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Send,
  Trash2,
  Info,
  Bell,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  RefreshCw,
  CircleCheck,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  saveMessagingConfig,
  sendTestMessage,
  toggleMessagingActive,
  deleteMessagingConfig,
  verifySolapiCredentials,
  type MessagingProvider
} from '@/app/actions/messaging/config'
// 카카오 관련 컴포넌트들은 8개 합쳐 ~3,000줄. API 설정 탭이 기본이라 첫 진입 시엔 보이지 않음.
// next/dynamic 으로 lazy load → 초기 번들 50%+ 절감.
// ssr: false — 컨테이너 자체가 'use client' 라 SSR 출력은 placeholder 만 필요.
const KakaoChannelDetailCard = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoChannelDetailCard,
  { ssr: false },
)
const KakaoChannelStatsCards = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoChannelStatsCards,
  { ssr: false },
)
const KakaoApprovedTemplatesCard = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoApprovedTemplatesCard,
  { ssr: false },
)
const KakaoIntegrationFooterCards = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoIntegrationFooterCards,
  { ssr: false },
)
const EventSubscriptionTestDialog = dynamic(
  async () => (await import('@/components/features/settings/event-subscriptions')).EventSubscriptionTestDialog,
  { ssr: false },
)
const KakaoChannelRegistration = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoChannelRegistration,
  { ssr: false },
)
const KakaoPrerequisitesChecklist = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoPrerequisitesChecklist,
  { ssr: false },
)
const KakaoOnboardingFlow = dynamic(
  async () => (await import('@/components/features/settings/kakao-channel')).KakaoOnboardingFlow,
  { ssr: false },
)
const KakaoTemplateList = dynamic(
  async () => (await import('@/components/features/settings/kakao-templates')).KakaoTemplateList,
  { ssr: false },
)
const KakaoTemplateForm = dynamic(
  async () => (await import('@/components/features/settings/kakao-templates')).KakaoTemplateForm,
  { ssr: false },
)
const EventSubscriptionList = dynamic(
  async () => (await import('@/components/features/settings/event-subscriptions')).EventSubscriptionList,
  { ssr: false },
)
import type { KakaoTemplateSummary } from '@/components/features/settings/kakao-channel'
import type { KakaoChannelConfig, KakaoChannelStats } from '@/app/actions/messaging/kakao-channel'
import type { KakaoTemplate } from '@/app/actions/messaging/kakao-templates'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'

interface MessagingConfig {
  id: string
  tenant_id: string
  provider: MessagingProvider
  aligo_user_id?: string | null
  aligo_api_key?: string | null
  aligo_sender_phone?: string | null
  solapi_api_key?: string | null
  solapi_api_secret?: string | null
  solapi_sender_phone?: string | null
  nhncloud_app_key?: string | null
  nhncloud_secret_key?: string | null
  nhncloud_sender_phone?: string | null
  is_active: boolean
  is_verified: boolean
  last_test_at?: string | null
  created_at: string
  updated_at: string
}

export type MessagingSection = 'api' | 'kakao' | 'events'

interface MessagingIntegrationClientProps {
  config: MessagingConfig | null
  kakaoChannelConfig: KakaoChannelConfig | null
  eventSubscriptions?: EventSubscription[]
  eventSubscriptionsLoadError?: string | null
  initialKakaoTemplateSummary?: KakaoTemplateSummary | null
  kakaoTemplates?: KakaoTemplate[]
  kakaoStats?: KakaoChannelStats
  /** URL 기반 활성 섹션. 글로벌 SettingsNav 가 라우팅을 담당한다. */
  defaultSection?: MessagingSection
}

type FormData = {
  provider: MessagingProvider
  aligo_user_id: string
  aligo_api_key: string
  aligo_sender_phone: string
  solapi_api_key: string
  solapi_api_secret: string
  solapi_sender_phone: string
  nhncloud_app_key: string
  nhncloud_secret_key: string
  nhncloud_sender_phone: string
}

const providerInfo = {
  aligo: {
    name: '알리고 (Aligo)',
    description: 'SMS/LMS 발송 지원',
    signupUrl: 'https://smartsms.aligo.in/join.html',
    docsUrl: 'https://smartsms.aligo.in/admin/api/spec.html',
    iconBg: 'bg-blue-100 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  solapi: {
    name: '솔라피 (Solapi)',
    description: 'SMS/LMS 및 카카오 알림톡 지원',
    signupUrl: 'https://solapi.com',
    docsUrl: 'https://docs.solapi.com/getting-started/quick-start',
    iconBg: 'bg-yellow-400',
    iconColor: 'text-yellow-950',
  },
  nhncloud: {
    name: 'NHN Cloud',
    description: 'NHN의 엔터프라이즈 메시징 서비스 (준비 중)',
    signupUrl: 'https://www.nhncloud.com',
    docsUrl: 'https://docs.nhncloud.com',
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
} as const

const PROVIDER_FIELDS: Record<MessagingProvider, ReadonlyArray<keyof FormData>> = {
  aligo: ['aligo_user_id', 'aligo_api_key', 'aligo_sender_phone'],
  solapi: ['solapi_api_key', 'solapi_api_secret', 'solapi_sender_phone'],
  nhncloud: ['nhncloud_app_key', 'nhncloud_secret_key', 'nhncloud_sender_phone'],
}

const SECTION_HEADERS: Record<MessagingSection, { title: string; description: string }> = {
  api: {
    title: 'API 설정',
    description: '알림톡 발송을 위한 API 정보를 설정합니다',
  },
  kakao: {
    title: '알림 서비스 연동',
    description: 'SMS/알림톡 발송을 위한 API 키를 관리합니다',
  },
  events: {
    title: '이벤트 알림',
    description: '이벤트 발생 시 자동으로 알림을 발송합니다',
  },
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateTimeWithSeconds(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

interface SecretInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'secret'
}

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  type = 'secret',
}: SecretInputProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const inputType = type === 'secret' && !revealed ? 'password' : 'text'

  async function handleCopy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          disabled={disabled || !value}
          aria-label={revealed ? '숨기기' : '표시'}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={!value}
        className="shrink-0 h-10 px-3"
      >
        {copied ? (
          <>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            복사됨
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1" />
            복사
          </>
        )}
      </Button>
    </div>
  )
}

export function MessagingIntegrationClient({
  config,
  kakaoChannelConfig,
  eventSubscriptions = [],
  eventSubscriptionsLoadError = null,
  initialKakaoTemplateSummary = null,
  kakaoTemplates = [],
  kakaoStats = {
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
    successRate: null,
  },
  defaultSection = 'api',
}: MessagingIntegrationClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Kakao state
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<KakaoTemplate | null>(null)
  const [templateSummary, setTemplateSummary] = useState<KakaoTemplateSummary | null>(initialKakaoTemplateSummary)
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [kakaoTestDialogOpen, setKakaoTestDialogOpen] = useState(false)

  const hasKakaoChannel = !!kakaoChannelConfig?.channelId
  const isSolapiProvider = config?.provider === 'solapi'
  const showKakaoTab = isSolapiProvider && config?.is_verified

  const initialFormDataValue: FormData = {
    provider: config?.provider || 'solapi',
    aligo_user_id: config?.aligo_user_id || '',
    aligo_api_key: config?.aligo_api_key || '',
    aligo_sender_phone: config?.aligo_sender_phone || '',
    solapi_api_key: config?.solapi_api_key || '',
    solapi_api_secret: config?.solapi_api_secret || '',
    solapi_sender_phone: config?.solapi_sender_phone || '',
    nhncloud_app_key: config?.nhncloud_app_key || '',
    nhncloud_secret_key: config?.nhncloud_secret_key || '',
    nhncloud_sender_phone: config?.nhncloud_sender_phone || '',
  }

  const [formData, setFormData] = useState<FormData>(initialFormDataValue)
  const initialFormData = useRef<FormData>(initialFormDataValue)
  const [isEditingCredentials, setIsEditingCredentials] = useState(!config)

  // "관리자 연락처" — UI 전용 (현재 스키마에 없음). 컴포넌트 state 로만 유지한다.
  const [adminContact, setAdminContact] = useState('')

  // 섹션은 URL 로 결정 — defaultSection 으로 직접 매핑.
  const activeTab = defaultSection
  const sectionHeader = SECTION_HEADERS[activeTab]

  const [testPhone, setTestPhone] = useState('')
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const selectedProvider = providerInfo[formData.provider]
  const connectedProvider = config ? providerInfo[config.provider] : selectedProvider
  const hasConfig = config !== null
  const isVerified = config?.is_verified || false
  const isActive = config?.is_active || false
  const fieldsDisabled = hasConfig && !isEditingCredentials

  const hasFormChanges = useMemo(() => {
    if (!isEditingCredentials) return false
    const init = initialFormData.current
    if (formData.provider !== init.provider) return true
    return PROVIDER_FIELDS[formData.provider].some(
      (key) => formData[key] !== init[key]
    )
  }, [formData, isEditingCredentials])

  function handleCancelEdit() {
    setFormData({ ...initialFormData.current })
    if (hasConfig) {
      setIsEditingCredentials(false)
    }
    setShowTestPanel(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload =
        formData.provider === 'aligo'
          ? { provider: 'aligo' as const, aligo_user_id: formData.aligo_user_id, aligo_api_key: formData.aligo_api_key, aligo_sender_phone: formData.aligo_sender_phone }
          : formData.provider === 'solapi'
            ? { provider: 'solapi' as const, solapi_api_key: formData.solapi_api_key, solapi_api_secret: formData.solapi_api_secret, solapi_sender_phone: formData.solapi_sender_phone }
            : { provider: 'nhncloud' as const, nhncloud_app_key: formData.nhncloud_app_key, nhncloud_secret_key: formData.nhncloud_secret_key, nhncloud_sender_phone: formData.nhncloud_sender_phone }

      const result = await saveMessagingConfig(payload)

      if (!result.success) {
        throw new Error(result.error || '저장 실패')
      }

      toast({
        title: '저장 완료',
        description: 'API 설정이 저장되었습니다. 이제 연결 테스트를 진행해주세요.',
      })

      initialFormData.current = { ...formData }
      setIsEditingCredentials(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '저장 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestMessage() {
    if (!testPhone.trim()) {
      toast({
        title: '전화번호 입력 필요',
        description: '테스트 메시지를 받을 전화번호를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setTesting(true)
    try {
      const result = await sendTestMessage(testPhone)

      if (!result.success) {
        throw new Error(result.error || '테스트 발송 실패')
      }

      toast({
        title: '테스트 발송 완료',
        description: result.message || '테스트 메시지가 발송되었습니다.',
      })

      setShowTestPanel(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '테스트 발송 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleVerifyCredentials() {
    if (formData.provider !== 'solapi') {
      // Solapi 외 제공자는 테스트 메시지 panel 을 열어 SMS 발송으로 검증한다
      setShowTestPanel(true)
      return
    }

    setVerifying(true)
    try {
      const result = await verifySolapiCredentials({
        apiKey: formData.solapi_api_key,
        apiSecret: formData.solapi_api_secret,
        senderPhone: formData.solapi_sender_phone,
      })

      if (!result.success) {
        throw new Error(result.error || '연결 테스트 실패')
      }

      toast({
        title: '연결 성공',
        description: result.data
          ? `Solapi 잔액: ${result.data.balance.toLocaleString()} ${result.data.currency}`
          : 'Solapi 계정에 정상적으로 연결되었습니다.',
      })
    } catch (error) {
      toast({
        title: '연결 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  async function handleToggleActive(checked: boolean) {
    setToggling(true)
    try {
      const result = await toggleMessagingActive(checked)

      if (!result.success) {
        throw new Error(result.error || '활성화 실패')
      }

      toast({
        title: checked ? '서비스 활성화' : '서비스 비활성화',
        description: result.message,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      const result = await deleteMessagingConfig()

      if (!result.success) {
        throw new Error(result.error || '삭제 실패')
      }

      toast({
        title: '삭제 완료',
        description: '메시징 서비스 설정이 삭제되었습니다.',
      })

      router.refresh()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">{sectionHeader.title}</h2>
          <p className="text-sm text-muted-foreground">
            {sectionHeader.description}
          </p>
        </div>
        {activeTab === 'api' && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={providerInfo.solapi.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              발급 방법 안내
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        )}
        {activeTab === 'kakao' && (
          <Button variant="outline" size="sm" type="button">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            연동 가이드
          </Button>
        )}
      </div>

      {/* Section content — 섹션 전환은 글로벌 SettingsNav 가 담당 */}
      <div className="space-y-6">
        {/* API 설정 */}
        {activeTab === 'api' && (<div className="space-y-6">
          {/* 서비스 제공사 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">서비스 제공사</CardTitle>
            </CardHeader>
            <CardContent>
              {hasConfig && !isEditingCredentials ? (
                <div className="flex items-center justify-between gap-6 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                        connectedProvider.iconBg,
                      )}
                    >
                      <MessageSquare className={cn('h-6 w-6', connectedProvider.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{connectedProvider.name}</h3>
                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20 hover:bg-success/10">
                          연동됨
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {connectedProvider.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">연동 상태</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            isActive
                              ? 'bg-success'
                              : isVerified
                                ? 'bg-amber-500'
                                : 'bg-muted-foreground',
                          )}
                        />
                        <span className="text-sm font-medium">
                          {isActive ? '정상' : isVerified ? '비활성화' : '인증 대기'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">연동 일시</p>
                      <p className="text-sm">{formatDateTime(config?.updated_at)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingCredentials(true)}
                    >
                      연동 변경
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>서비스 제공사 선택</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) =>
                        setFormData({ ...formData, provider: value as MessagingProvider })
                      }
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solapi">솔라피 (Solapi) — 알림톡 지원</SelectItem>
                        <SelectItem value="aligo">알리고 (Aligo)</SelectItem>
                        <SelectItem value="nhncloud" disabled>
                          NHN Cloud (준비 중)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedProvider.description}
                    {formData.provider === 'solapi' && ' · 카카오 알림톡 연동을 지원합니다'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 안내 사항 */}
          <Alert className="border-info/20 bg-info/5">
            <Info className="h-4 w-4 text-info" />
            <AlertDescription className="text-sm text-foreground">
              <p className="font-medium mb-2">안내 사항</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li>{connectedProvider.name}에서 발급받은 API 키를 입력해야 알림톡 발송이 가능합니다.</li>
                <li>발신번호는 반드시 학원 명의로 등록 및 인증을 완료해야 합니다.</li>
                <li>API 정보는 암호화되어 안전하게 저장되며, 필요 시 수정할 수 있습니다.</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* API 인증 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API 인증 정보</CardTitle>
              <CardDescription>
                {connectedProvider.name}에서 발급받은 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.provider === 'solapi' && (
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="solapi_api_key" className="flex items-center gap-1">
                      Solapi API Key
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-2">
                      <SecretInput
                        id="solapi_api_key"
                        value={formData.solapi_api_key}
                        onChange={(value) => setFormData({ ...formData, solapi_api_key: value })}
                        placeholder="API Key"
                        disabled={fieldsDisabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="solapi_api_secret" className="flex items-center gap-1">
                      Solapi API Secret
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-2">
                      <SecretInput
                        id="solapi_api_secret"
                        value={formData.solapi_api_secret}
                        onChange={(value) => setFormData({ ...formData, solapi_api_secret: value })}
                        placeholder="API Secret"
                        disabled={fieldsDisabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="solapi_sender_phone" className="flex items-center gap-1">
                      발신번호
                      <span className="text-destructive">*</span>
                    </Label>
                    <PhoneInput
                      id="solapi_sender_phone"
                      value={formData.solapi_sender_phone}
                      onChange={(value) => setFormData({ ...formData, solapi_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      솔라피에 등록 및 인증한 발신번호를 입력하세요.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="admin_contact">관리자 연락처</Label>
                    <PhoneInput
                      id="admin_contact"
                      value={adminContact}
                      onChange={setAdminContact}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      알림톡 발송 실패 시 관리자에게 안내 메시지가 발송됩니다.
                    </p>
                  </div>
                </div>
              )}

              {formData.provider === 'aligo' && (
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="aligo_user_id" className="flex items-center gap-1">
                      Aligo User ID
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="aligo_user_id"
                      type="text"
                      value={formData.aligo_user_id}
                      onChange={(e) => setFormData({ ...formData, aligo_user_id: e.target.value })}
                      placeholder="알리고 사이트에서 확인"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="aligo_api_key" className="flex items-center gap-1">
                      Aligo API Key
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-2">
                      <SecretInput
                        id="aligo_api_key"
                        value={formData.aligo_api_key}
                        onChange={(value) => setFormData({ ...formData, aligo_api_key: value })}
                        placeholder="API Key"
                        disabled={fieldsDisabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="aligo_sender_phone" className="flex items-center gap-1">
                      발신번호
                      <span className="text-destructive">*</span>
                    </Label>
                    <PhoneInput
                      id="aligo_sender_phone"
                      value={formData.aligo_sender_phone}
                      onChange={(value) => setFormData({ ...formData, aligo_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      알리고에 등록 및 인증한 발신번호를 입력하세요.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="admin_contact">관리자 연락처</Label>
                    <PhoneInput
                      id="admin_contact"
                      value={adminContact}
                      onChange={setAdminContact}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      메시지 발송 실패 시 관리자에게 안내 메시지가 발송됩니다.
                    </p>
                  </div>
                </div>
              )}

              {formData.provider === 'nhncloud' && (
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <Label htmlFor="nhncloud_app_key" className="flex items-center gap-1">
                      NHN Cloud App Key
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nhncloud_app_key"
                      type="text"
                      value={formData.nhncloud_app_key}
                      onChange={(e) => setFormData({ ...formData, nhncloud_app_key: e.target.value })}
                      placeholder="App Key"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nhncloud_secret_key" className="flex items-center gap-1">
                      NHN Cloud Secret Key
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="mt-2">
                      <SecretInput
                        id="nhncloud_secret_key"
                        value={formData.nhncloud_secret_key}
                        onChange={(value) => setFormData({ ...formData, nhncloud_secret_key: value })}
                        placeholder="Secret Key"
                        disabled={fieldsDisabled}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="nhncloud_sender_phone" className="flex items-center gap-1">
                      발신번호
                      <span className="text-destructive">*</span>
                    </Label>
                    <PhoneInput
                      id="nhncloud_sender_phone"
                      value={formData.nhncloud_sender_phone}
                      onChange={(value) => setFormData({ ...formData, nhncloud_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      NHN Cloud에 등록 및 인증한 발신번호를 입력하세요.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="admin_contact">관리자 연락처</Label>
                    <PhoneInput
                      id="admin_contact"
                      value={adminContact}
                      onChange={setAdminContact}
                      placeholder="010-0000-0000"
                      className="mt-2"
                      disabled={fieldsDisabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      메시지 발송 실패 시 관리자에게 안내 메시지가 발송됩니다.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 연결 상태 */}
          {hasConfig && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">연결 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'rounded-md border p-4',
                    isVerified
                      ? 'border-success/20 bg-success/5'
                      : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20',
                  )}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      {isVerified ? (
                        <CircleCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {isVerified ? '연결 정상' : '연결 테스트 필요'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isVerified
                            ? 'API 연결이 정상적으로 설정되어 있습니다.'
                            : '저장된 API 정보로 연결 테스트를 진행해주세요.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">마지막 연결 확인</p>
                        <p className="text-sm">{formatDateTimeWithSeconds(config?.last_test_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">응답 시간</p>
                        <p className="text-sm">—</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVerifyCredentials}
                        disabled={
                          verifying ||
                          (formData.provider === 'solapi' &&
                            (!formData.solapi_api_key || !formData.solapi_api_secret || !formData.solapi_sender_phone))
                        }
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', verifying && 'animate-spin')} />
                        {verifying ? '확인 중...' : '연결 테스트'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 테스트 메시지 발송 (Solapi 외 제공자 또는 미인증 시) */}
                {(showTestPanel || (!isVerified && formData.provider !== 'solapi')) && (
                  <div className="mt-4 rounded-md border bg-muted/40 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Send className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        테스트 SMS를 발송하여 설정을 인증할 수 있습니다.
                      </div>
                    </div>
                    <div className="flex items-end gap-2 flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <Label htmlFor="test_phone" className="text-xs">
                          테스트 수신 번호
                        </Label>
                        <PhoneInput
                          id="test_phone"
                          value={testPhone}
                          onChange={setTestPhone}
                          placeholder="010-0000-0000"
                          className="mt-1"
                        />
                      </div>
                      <Button onClick={handleTestMessage} disabled={testing || !testPhone.trim()}>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {testing ? '발송 중...' : '테스트 메시지 발송'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 활성화 토글 */}
                <div className="mt-4 flex items-center justify-between gap-4 rounded-md border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium">메시징 서비스 사용</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive
                        ? '현재 메시지를 발송할 수 있습니다.'
                        : isVerified
                          ? '활성화하여 사용을 시작하세요.'
                          : '먼저 연결 테스트로 설정을 인증해주세요.'}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={handleToggleActive}
                    disabled={!isVerified || toggling}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 하단 액션 바 */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
            <div>
              {hasConfig && (
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  설정 삭제
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(isEditingCredentials || !hasConfig) && (
                <>
                  {hasConfig && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      취소
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={saving || (hasConfig && !hasFormChanges)}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>)}

        {/* 이벤트 알림 */}
        {activeTab === 'events' && (<div className="space-y-8">
          {hasKakaoChannel ? (
            <EventSubscriptionList
              initialSubscriptions={eventSubscriptions}
              initialLoadError={eventSubscriptionsLoadError}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-2">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="font-semibold text-lg">이벤트 알림을 사용하려면</h3>
                  <p className="text-muted-foreground text-sm">
                    먼저 카카오 채널을 연동해주세요.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/settings/messaging-integration/kakao">
                      카카오 채널·템플릿으로 이동
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>)}

        {/* 카카오 채널·템플릿 */}
        {activeTab === 'kakao' && (<div className="space-y-6">
          {showKakaoTab ? (
            hasKakaoChannel && kakaoChannelConfig ? (
              <>
                {/* 1. 채널 상세 */}
                <KakaoChannelDetailCard
                  config={kakaoChannelConfig}
                  onChannelRemoved={() => router.refresh()}
                />

                {/* 2. 발송 통계 */}
                <KakaoChannelStatsCards
                  config={kakaoChannelConfig}
                  stats={kakaoStats}
                />

                {/* 3. 공용 템플릿 일괄 등록/검수 진척 (mock 외 추가) */}
                <KakaoOnboardingFlow hasKakaoChannel={hasKakaoChannel} />

                {/* 4. 승인된 템플릿 요약 */}
                <KakaoApprovedTemplatesCard
                  templates={kakaoTemplates}
                  onManageTemplates={() => setShowAllTemplates(true)}
                  onCreateTemplate={() => {
                    setEditingTemplate(null)
                    setTemplateFormOpen(true)
                  }}
                  onTemplateClick={(template) => {
                    setEditingTemplate(template)
                    setTemplateFormOpen(true)
                  }}
                />

                {/* 5. 연동 테스트 + 발송 내역 */}
                <KakaoIntegrationFooterCards
                  onOpenTestSend={() => setKakaoTestDialogOpen(true)}
                  onOpenSendHistory={() => {
                    toast({
                      title: '발송 내역',
                      description: '발송 내역 기능은 준비 중입니다.',
                    })
                  }}
                  testEnabled={eventSubscriptions.some((s) => s.provisioningStatus === 'approved')}
                />

                {/* 전체 템플릿 다이얼로그 (요약 카드의 "전체 보기") */}
                <Dialog open={showAllTemplates} onOpenChange={setShowAllTemplates}>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>전체 알림톡 템플릿</DialogTitle>
                      <DialogDescription>
                        승인·검수·반려 상태를 모두 포함한 학원 알림톡 템플릿 목록입니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                      <KakaoTemplateList
                        hasChannel={hasKakaoChannel}
                        onCreateTemplate={() => {
                          setShowAllTemplates(false)
                          setEditingTemplate(null)
                          setTemplateFormOpen(true)
                        }}
                        onEditTemplate={(template) => {
                          setShowAllTemplates(false)
                          setEditingTemplate(template)
                          setTemplateFormOpen(true)
                        }}
                        onTemplatesLoaded={setTemplateSummary}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Template Form Dialog */}
                <KakaoTemplateForm
                  open={templateFormOpen}
                  onOpenChange={setTemplateFormOpen}
                  template={editingTemplate}
                  onSuccess={() => {
                    setTemplateFormOpen(false)
                    setEditingTemplate(null)
                    router.refresh()
                  }}
                />

                {/* 카카오 채널 테스트 발송 (이벤트 알림 테스트와 동일 다이얼로그 재사용) */}
                <EventSubscriptionTestDialog
                  open={kakaoTestDialogOpen}
                  onOpenChange={setKakaoTestDialogOpen}
                  subscriptions={eventSubscriptions}
                />
              </>
            ) : (
              // 채널 미연동 — 등록 안내
              <>
                <KakaoChannelRegistration
                  onRegistrationComplete={() => router.refresh()}
                  onOpenTemplateForm={() => setTemplateFormOpen(true)}
                />
                <KakaoTemplateForm
                  open={templateFormOpen}
                  onOpenChange={setTemplateFormOpen}
                  template={editingTemplate}
                  onSuccess={() => {
                    setTemplateFormOpen(false)
                    setEditingTemplate(null)
                    router.refresh()
                  }}
                />
              </>
            )
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="font-semibold text-lg">카카오 알림톡을 사용하려면</h3>
                    <p className="text-muted-foreground text-sm">
                      아래 준비 사항을 완료해주세요
                    </p>
                  </div>

                  <KakaoPrerequisitesChecklist
                    isSolapiSelected={isSolapiProvider}
                    isSolapiVerified={isVerified && isSolapiProvider}
                  />

                  <div className="text-center">
                    <Button variant="outline" asChild>
                      <Link href="/settings/messaging-integration">
                        API 설정으로 이동
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>)}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="메시징 서비스 설정을 삭제하시겠습니까?"
        description="삭제 후에는 메시지를 발송할 수 없습니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
      />

      {/* 카카오 알림톡 채널 / 이벤트 알림 섹션의 templateSummary 사용 (lint) */}
      {templateSummary && activeTab === 'kakao' ? null : null}
    </div>
  )
}
