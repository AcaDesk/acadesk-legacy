'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Alert, AlertDescription } from '@ui/alert'
import { Switch } from '@ui/switch'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  MessageSquare,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Send,
  Save,
  Trash2,
  Info,
  ShieldCheck,
  Settings,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  saveMessagingConfig,
  sendTestMessage,
  toggleMessagingActive,
  deleteMessagingConfig,
  type MessagingProvider
} from '@/app/actions/messaging-config'
import { KakaoChannelStatus, KakaoChannelRegistration } from '@/components/features/settings/kakao-channel'
import { KakaoTemplateList, KakaoTemplateForm } from '@/components/features/settings/kakao-templates'
import type { KakaoChannelConfig } from '@/app/actions/kakao-channel'
import type { KakaoTemplate } from '@/app/actions/kakao-templates'

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

interface MessagingIntegrationClientProps {
  config: MessagingConfig | null
  kakaoChannelConfig: KakaoChannelConfig | null
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
    description: '국내 대표 SMS/알림톡 서비스',
    signupUrl: 'https://smartsms.aligo.in/join.html',
    docsUrl: 'https://smartsms.aligo.in/admin/api/spec.html',
    icon: MessageSquare,
  },
  solapi: {
    name: '솔라피 (Solapi)',
    description: '개발자 친화적 메시징 API',
    signupUrl: 'https://solapi.com',
    docsUrl: 'https://docs.solapi.com',
    icon: MessageSquare,
  },
  nhncloud: {
    name: 'NHN Cloud',
    description: 'NHN의 엔터프라이즈 메시징 서비스',
    signupUrl: 'https://www.nhncloud.com',
    docsUrl: 'https://docs.nhncloud.com',
    icon: MessageSquare,
  },
}

export function MessagingIntegrationClient({ config, kakaoChannelConfig }: MessagingIntegrationClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Kakao state
  const [templateFormOpen, setTemplateFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<KakaoTemplate | null>(null)

  const hasKakaoChannel = !!kakaoChannelConfig?.channelId
  const isSolapiProvider = config?.provider === 'solapi'
  const showKakaoTab = isSolapiProvider && config?.is_verified

  const [formData, setFormData] = useState<FormData>({
    provider: config?.provider || 'aligo',
    aligo_user_id: config?.aligo_user_id || '',
    aligo_api_key: config?.aligo_api_key || '',
    aligo_sender_phone: config?.aligo_sender_phone || '',
    solapi_api_key: config?.solapi_api_key || '',
    solapi_api_secret: config?.solapi_api_secret || '',
    solapi_sender_phone: config?.solapi_sender_phone || '',
    nhncloud_app_key: config?.nhncloud_app_key || '',
    nhncloud_secret_key: config?.nhncloud_secret_key || '',
    nhncloud_sender_phone: config?.nhncloud_sender_phone || '',
  })

  const [testPhone, setTestPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const selectedProvider = providerInfo[formData.provider]
  const hasConfig = config !== null
  const isVerified = config?.is_verified || false
  const isActive = config?.is_active || false

  async function handleSave() {
    setSaving(true)
    try {
      let payload: any = { provider: formData.provider }

      if (formData.provider === 'aligo') {
        payload = {
          ...payload,
          aligo_user_id: formData.aligo_user_id,
          aligo_api_key: formData.aligo_api_key,
          aligo_sender_phone: formData.aligo_sender_phone,
        }
      } else if (formData.provider === 'solapi') {
        payload = {
          ...payload,
          solapi_api_key: formData.solapi_api_key,
          solapi_api_secret: formData.solapi_api_secret,
          solapi_sender_phone: formData.solapi_sender_phone,
        }
      } else if (formData.provider === 'nhncloud') {
        payload = {
          ...payload,
          nhncloud_app_key: formData.nhncloud_app_key,
          nhncloud_secret_key: formData.nhncloud_secret_key,
          nhncloud_sender_phone: formData.nhncloud_sender_phone,
        }
      }

      const result = await saveMessagingConfig(payload)

      if (!result.success) {
        throw new Error(result.error || '저장 실패')
      }

      toast({
        title: '저장 완료',
        description: 'API 설정이 저장되었습니다. 이제 테스트 메시지를 발송해주세요.',
      })

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
        description: result.message || '테스트 메시지가 발송되었습니다. 메시지 수신을 확인해주세요.',
      })

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

  function handleDeleteClick() {
    setDeleteDialogOpen(true)
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
      <div>
        <h1 className="text-3xl font-bold">알림 서비스 연동</h1>
        <p className="text-muted-foreground">
          SMS/알림톡 발송을 위한 API 키를 관리합니다
        </p>
      </div>

      {/* Status Card - Always visible */}
      {hasConfig && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">서비스 상태</CardTitle>
                <CardDescription>현재 메시징 서비스 연동 상태</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{providerInfo[config.provider].name}</Badge>
                {isVerified && (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    인증 완료
                  </Badge>
                )}
                {isActive && (
                  <Badge className="gap-1 bg-green-600">
                    <Check className="h-3 w-3" />
                    활성화
                  </Badge>
                )}
                {!isActive && isVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <X className="h-3 w-3" />
                    비활성화
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">메시징 서비스 사용</p>
                <p className="text-xs text-muted-foreground">
                  {isActive
                    ? '현재 메시지를 발송할 수 있습니다'
                    : isVerified
                      ? '테스트 인증이 완료되었습니다. 활성화하여 사용을 시작하세요'
                      : '먼저 테스트 메시지를 발송하여 설정을 인증해주세요'}
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

      {/* Tabs */}
      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="api" className="gap-2">
            <Settings className="h-4 w-4" />
            API 설정
          </TabsTrigger>
          <TabsTrigger value="kakao" className="gap-2" disabled={!showKakaoTab}>
            <MessageSquare className="h-4 w-4" />
            카카오 알림톡
            {!showKakaoTab && (
              <span className="text-xs text-muted-foreground ml-1">(솔라피 인증 필요)</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* API 설정 Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-2">셀프 서비스 안내</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-blue-700 dark:text-blue-300">
                <li>원장님이 직접 메시징 서비스(알리고, 솔라피 등)에 가입하고 API 키를 발급받아 등록합니다</li>
                <li>발송 비용은 원장님의 메시징 서비스 계정에서 직접 차감됩니다</li>
                <li>발신번호는 반드시 해당 서비스에서 사전 등록 및 인증을 받아야 합니다</li>
                <li>API 키는 암호화되어 안전하게 저장됩니다</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle>메시징 서비스 선택</CardTitle>
              <CardDescription>사용할 SMS/알림톡 서비스를 선택하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>서비스 제공사</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value as MessagingProvider })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aligo">알리고 (Aligo)</SelectItem>
                      <SelectItem value="solapi">솔라피 (Solapi) - 알림톡 지원</SelectItem>
                      <SelectItem value="nhncloud">NHN Cloud</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <selectedProvider.icon className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">{selectedProvider.name}</p>
                    <p className="text-xs text-muted-foreground mb-2">{selectedProvider.description}</p>
                    {formData.provider === 'solapi' && (
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                        * 솔라피는 카카오 알림톡 연동을 지원합니다
                      </p>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={selectedProvider.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        회원가입 <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-xs text-muted-foreground">|</span>
                      <a
                        href={selectedProvider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        API 문서 <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Credentials Form */}
          <Card>
            <CardHeader>
              <CardTitle>API 인증 정보</CardTitle>
              <CardDescription>
                {selectedProvider.name}에서 발급받은 API 키를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.provider === 'aligo' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="aligo_user_id">Aligo User ID *</Label>
                    <Input
                      id="aligo_user_id"
                      type="text"
                      value={formData.aligo_user_id}
                      onChange={(e) => setFormData({ ...formData, aligo_user_id: e.target.value })}
                      placeholder="알리고 사이트에서 확인"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="aligo_api_key">Aligo API Key *</Label>
                    <Input
                      id="aligo_api_key"
                      type="password"
                      value={formData.aligo_api_key}
                      onChange={(e) => setFormData({ ...formData, aligo_api_key: e.target.value })}
                      placeholder="API Key"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="aligo_sender_phone">발신번호 *</Label>
                    <PhoneInput
                      id="aligo_sender_phone"
                      value={formData.aligo_sender_phone}
                      onChange={(value) => setFormData({ ...formData, aligo_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      알리고에 등록 및 인증된 발신번호를 입력하세요
                    </p>
                  </div>
                </div>
              )}

              {formData.provider === 'solapi' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="solapi_api_key">Solapi API Key *</Label>
                    <Input
                      id="solapi_api_key"
                      type="text"
                      value={formData.solapi_api_key}
                      onChange={(e) => setFormData({ ...formData, solapi_api_key: e.target.value })}
                      placeholder="API Key"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="solapi_api_secret">Solapi API Secret *</Label>
                    <Input
                      id="solapi_api_secret"
                      type="password"
                      value={formData.solapi_api_secret}
                      onChange={(e) => setFormData({ ...formData, solapi_api_secret: e.target.value })}
                      placeholder="API Secret"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="solapi_sender_phone">발신번호 *</Label>
                    <PhoneInput
                      id="solapi_sender_phone"
                      value={formData.solapi_sender_phone}
                      onChange={(value) => setFormData({ ...formData, solapi_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      솔라피에 등록 및 인증된 발신번호를 입력하세요
                    </p>
                  </div>
                </div>
              )}

              {formData.provider === 'nhncloud' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nhncloud_app_key">NHN Cloud App Key *</Label>
                    <Input
                      id="nhncloud_app_key"
                      type="text"
                      value={formData.nhncloud_app_key}
                      onChange={(e) => setFormData({ ...formData, nhncloud_app_key: e.target.value })}
                      placeholder="App Key"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nhncloud_secret_key">NHN Cloud Secret Key *</Label>
                    <Input
                      id="nhncloud_secret_key"
                      type="password"
                      value={formData.nhncloud_secret_key}
                      onChange={(e) => setFormData({ ...formData, nhncloud_secret_key: e.target.value })}
                      placeholder="Secret Key"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nhncloud_sender_phone">발신번호 *</Label>
                    <PhoneInput
                      id="nhncloud_sender_phone"
                      value={formData.nhncloud_sender_phone}
                      onChange={(value) => setFormData({ ...formData, nhncloud_sender_phone: value })}
                      placeholder="010-0000-0000"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      NHN Cloud에 등록 및 인증된 발신번호를 입력하세요
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-6">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? '저장 중...' : '저장'}
                </Button>
                {hasConfig && (
                  <Button variant="outline" onClick={handleDeleteClick} disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    설정 삭제
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Message */}
          {hasConfig && !isVerified && (
            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <CardTitle className="text-lg">테스트 메시지 발송 필요</CardTitle>
                    <CardDescription>
                      설정을 인증하기 위해 테스트 메시지를 발송해주세요
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test_phone">테스트 수신 번호</Label>
                    <PhoneInput
                      id="test_phone"
                      value={testPhone}
                      onChange={setTestPhone}
                      placeholder="010-0000-0000"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      테스트 메시지를 받을 전화번호를 입력하세요
                    </p>
                  </div>
                  <Button onClick={handleTestMessage} disabled={testing}>
                    <Send className="h-4 w-4 mr-2" />
                    {testing ? '발송 중...' : '테스트 메시지 발송'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">도움말</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">1. 메시징 서비스 가입</p>
                  <p className="text-muted-foreground text-xs">
                    알리고, 솔라피, NHN Cloud 중 원하는 서비스에 가입하고 발신번호를 등록·인증받으세요.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">2. API 키 발급</p>
                  <p className="text-muted-foreground text-xs">
                    각 서비스의 관리자 페이지에서 API 키를 발급받으세요.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">3. Acadesk 설정</p>
                  <p className="text-muted-foreground text-xs">
                    위 폼에 API 키와 발신번호를 입력하고 저장한 후, 테스트 메시지를 발송하여 인증하세요.
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">4. 서비스 활성화</p>
                  <p className="text-muted-foreground text-xs">
                    테스트가 성공하면 서비스를 활성화하여 실제 메시지 발송을 시작할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 카카오 알림톡 Tab */}
        <TabsContent value="kakao" className="space-y-6">
          {showKakaoTab ? (
            <>
              {/* Kakao Channel Status or Registration */}
              {hasKakaoChannel && kakaoChannelConfig ? (
                <KakaoChannelStatus
                  config={kakaoChannelConfig}
                  onChannelRemoved={() => router.refresh()}
                />
              ) : (
                <KakaoChannelRegistration
                  onRegistrationComplete={() => router.refresh()}
                />
              )}

              {/* Kakao Templates */}
              <KakaoTemplateList
                hasChannel={hasKakaoChannel}
                onCreateTemplate={() => {
                  setEditingTemplate(null)
                  setTemplateFormOpen(true)
                }}
                onEditTemplate={(template) => {
                  setEditingTemplate(template)
                  setTemplateFormOpen(true)
                }}
              />

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
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg">카카오 알림톡을 사용하려면</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      솔라피(Solapi)를 선택하고 API 인증을 완료해주세요
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => {
                    const apiTab = document.querySelector('[data-state="inactive"][value="api"]') as HTMLElement
                    apiTab?.click()
                  }}>
                    API 설정으로 이동
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
