'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Alert, AlertDescription } from '@ui/alert'
import { Switch } from '@ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { BookOpen, Info, Loader2, Save, Eye } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { ScrollArea } from '@ui/scroll-area'
import { KakaoTemplateAuditGuide } from './KakaoTemplateAuditGuide'
import { KakaoTalkPreview } from '@/components/features/messaging/KakaoTalkPreview'
import { useToast } from '@/hooks/use-toast'
import {
  createKakaoTemplate,
  updateKakaoTemplate,
  getKakaoTemplateCategories,
  type KakaoTemplate,
} from '@/app/actions/messaging/kakao-templates'
import {
  kakaoTemplateFormSchema,
} from '@/lib/kakao/kakao-validation'
import type { KakaoTemplateCategory } from '@/infra/messaging/types/kakao.types'

interface KakaoTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: KakaoTemplate | null
  onSuccess?: () => void
}

type FormData = {
  name: string
  content: string
  categoryCode: string
  messageType: 'BA' | 'EX' | 'AD' | 'MI'
  emphasizeType: 'NONE' | 'TEXT'
  emphasizeTitle: string
  emphasizeSubtitle: string
  securityFlag: boolean
}

const defaultFormData: FormData = {
  name: '',
  content: '',
  categoryCode: '',
  messageType: 'BA',
  emphasizeType: 'NONE',
  emphasizeTitle: '',
  emphasizeSubtitle: '',
  securityFlag: false,
}

export function KakaoTemplateForm({
  open,
  onOpenChange,
  template,
  onSuccess,
}: KakaoTemplateFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const isEditing = !!template

  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [categories, setCategories] = useState<KakaoTemplateCategory[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rightPane, setRightPane] = useState<'preview' | 'guide'>('preview')

  // Load categories
  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        content: template.content,
        categoryCode: template.categoryCode,
        messageType: template.messageType,
        emphasizeType: template.emphasizeType === 'NONE' || template.emphasizeType === 'TEXT'
          ? template.emphasizeType
          : 'NONE',
        emphasizeTitle: template.emphasizeTitle || '',
        emphasizeSubtitle: template.emphasizeSubtitle || '',
        securityFlag: template.securityFlag,
      })
    } else {
      setFormData(defaultFormData)
    }
  }, [template, open])

  async function loadCategories() {
    setLoadingCategories(true)
    try {
      const result = await getKakaoTemplateCategories()
      if (result.success && result.data) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  function handleChange(field: keyof FormData, value: FormData[keyof FormData]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Extract variables from content
  function extractVariables(content: string): string[] {
    const matches = content.match(/#{([^}]+)}/g) || []
    return matches.map((m) => m.slice(2, -1))
  }

  async function handleSubmit() {
    // Zod validation
    const validationResult = kakaoTemplateFormSchema.safeParse(formData)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      toast({
        title: '입력 오류',
        description: firstError.message,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name,
        content: formData.content,
        categoryCode: formData.categoryCode,
        messageType: formData.messageType,
        emphasizeType: formData.emphasizeType,
        ...(formData.emphasizeType === 'TEXT' && {
          emphasizeTitle: formData.emphasizeTitle,
          emphasizeSubtitle: formData.emphasizeSubtitle,
        }),
        securityFlag: formData.securityFlag,
      }

      let result
      if (isEditing && template) {
        result = await updateKakaoTemplate(template.id, payload)
      } else {
        result = await createKakaoTemplate(payload)
      }

      if (!result.success) {
        throw new Error(result.error || '저장 실패')
      }

      toast({
        title: isEditing ? '템플릿 수정 완료' : '템플릿 등록 완료',
        description: result.warning || (
          isEditing
            ? '템플릿이 수정되었고 검수 요청이 시작되었습니다.'
            : '템플릿이 등록되었고 검수 요청이 시작되었습니다. 승인 후 발송 가능합니다.'
        ),
        variant: result.warning ? 'destructive' : undefined,
      })

      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch (error) {
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const variables = extractVariables(formData.content)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden max-w-[min(95vw,72rem)]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>{isEditing ? '템플릿 수정' : '새 알림톡 템플릿'}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? '대기 또는 반려 상태의 템플릿만 수정할 수 있습니다.'
                  : '저장 후 카카오 검수를 요청합니다. 승인된 템플릿만 발송할 수 있습니다.'}
              </DialogDescription>
            </div>
            {/* 우측 패널 토글 (미리보기 / 심사 가이드) */}
            <Tabs
              value={rightPane}
              onValueChange={(v) => setRightPane(v as 'preview' | 'guide')}
              className="shrink-0"
            >
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="preview" className="text-xs h-7 gap-1.5 px-3">
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </TabsTrigger>
                <TabsTrigger value="guide" className="text-xs h-7 gap-1.5 px-3">
                  <BookOpen className="h-3.5 w-3.5" />
                  심사 가이드
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ScrollArea className="max-h-[calc(90vh-180px)]">
        <div className="space-y-4 pr-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              저장하면 먼저 템플릿을 만들고 바로 검수를 요청합니다. 요청이 실패하면 대기 상태로 저장되며 목록에서 다시 요청할 수 있습니다.
            </AlertDescription>
          </Alert>

          {/* Template Name */}
          <div>
            <Label htmlFor="name">템플릿 이름 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="예: 학습 리포트 발송"
              className="mt-2"
              maxLength={150}
            />
          </div>

          {/* Category */}
          <div>
            <Label>카테고리 *</Label>
            <Select value={formData.categoryCode} onValueChange={(v) => handleChange('categoryCode', v)}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {loadingCategories ? (
                  <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                ) : categories.length === 0 ? (
                  <SelectItem value="none" disabled>카테고리 없음</SelectItem>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.code} value={cat.code}>
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Emphasize Type */}
          <div>
            <Label>강조 유형</Label>
            <Select
              value={formData.emphasizeType}
              onValueChange={(v) => handleChange('emphasizeType', v as FormData['emphasizeType'])}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">없음</SelectItem>
                <SelectItem value="TEXT">텍스트 강조</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Emphasize Title/Subtitle for TEXT type */}
          {formData.emphasizeType === 'TEXT' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emphasizeTitle">강조 제목 *</Label>
                <Input
                  id="emphasizeTitle"
                  value={formData.emphasizeTitle}
                  onChange={(e) => handleChange('emphasizeTitle', e.target.value)}
                  placeholder="최대 23자"
                  className="mt-2"
                  maxLength={23}
                />
              </div>
              <div>
                <Label htmlFor="emphasizeSubtitle">강조 부제목 *</Label>
                <Input
                  id="emphasizeSubtitle"
                  value={formData.emphasizeSubtitle}
                  onChange={(e) => handleChange('emphasizeSubtitle', e.target.value)}
                  placeholder="최대 23자"
                  className="mt-2"
                  maxLength={23}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <Label htmlFor="content">템플릿 내용 *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="#{학생명}님의 학습 리포트가 도착했습니다.&#10;&#10;자세한 내용은 아래 링크에서 확인하세요."
              className="mt-2 min-h-[150px] font-mono text-sm"
              maxLength={1000}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                변수는 #{'{'}변수명{'}'} 형식으로 입력 (예: #{'{'}학생명{'}'}, #{'{'}날짜{'}'})
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.content.length}/1000
              </p>
            </div>
          </div>

          {/* Detected Variables */}
          {variables.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <p className="font-medium mb-1">감지된 변수</p>
                <div className="flex flex-wrap gap-1">
                  {variables.map((v, i) => (
                    <code key={i} className="bg-muted px-1 rounded text-xs">
                      {v}
                    </code>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Security Flag */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">보안 템플릿</p>
              <p className="text-xs text-muted-foreground">
                OTP, 인증번호 등 민감한 정보가 포함된 경우 체크
              </p>
            </div>
            <Switch
              checked={formData.securityFlag}
              onCheckedChange={(checked) => handleChange('securityFlag', checked)}
            />
          </div>
        </div>
        </ScrollArea>
        <div className="lg:border-l lg:pl-4">
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            {rightPane === 'preview' ? (
              <div className="pr-2">
                <p className="text-xs text-muted-foreground mb-2">
                  실제 발송 시 보호자가 받는 알림톡 화면입니다. 변수는 샘플 값으로 표시됩니다.
                </p>
                <KakaoTalkPreview
                  content={formData.content || '템플릿 내용을 입력하면 미리보기가 표시됩니다.'}
                  variables={variables}
                />
              </div>
            ) : (
              <KakaoTemplateAuditGuide />
            )}
          </ScrollArea>
        </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? '수정하고 검수 요청' : '저장하고 검수 요청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
