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
import { Info, Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  createKakaoTemplate,
  updateKakaoTemplate,
  getKakaoTemplateCategories,
  type KakaoTemplate,
} from '@/app/actions/kakao-templates'
import type {
  KakaoTemplateCategory,
  KakaoMessageType,
  KakaoEmphasizeType,
} from '@/infra/messaging/types/kakao.types'

interface KakaoTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: KakaoTemplate | null
  onSuccess?: () => void
}

interface FormData {
  name: string
  content: string
  categoryCode: string
  messageType: KakaoMessageType
  emphasizeType: KakaoEmphasizeType
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
        emphasizeType: template.emphasizeType,
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

  function handleChange(field: keyof FormData, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Extract variables from content
  function extractVariables(content: string): string[] {
    const matches = content.match(/#{([^}]+)}/g) || []
    return matches.map((m) => m.slice(2, -1))
  }

  async function handleSubmit() {
    // Validation
    if (!formData.name.trim()) {
      toast({ title: '입력 오류', description: '템플릿 이름을 입력해주세요.', variant: 'destructive' })
      return
    }
    if (!formData.content.trim()) {
      toast({ title: '입력 오류', description: '템플릿 내용을 입력해주세요.', variant: 'destructive' })
      return
    }
    if (!formData.categoryCode) {
      toast({ title: '입력 오류', description: '카테고리를 선택해주세요.', variant: 'destructive' })
      return
    }
    if (formData.emphasizeType === 'TEXT') {
      if (!formData.emphasizeTitle.trim()) {
        toast({ title: '입력 오류', description: '강조 제목을 입력해주세요.', variant: 'destructive' })
        return
      }
      if (!formData.emphasizeSubtitle.trim()) {
        toast({ title: '입력 오류', description: '강조 부제목을 입력해주세요.', variant: 'destructive' })
        return
      }
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
        description: isEditing
          ? '템플릿이 수정되어 재검수 요청되었습니다.'
          : '템플릿이 등록되어 검수 요청되었습니다. 승인 후 발송 가능합니다.',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '템플릿 수정' : '새 알림톡 템플릿'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? '템플릿을 수정하면 다시 검수 요청됩니다.'
              : '알림톡 템플릿을 등록합니다. 카카오 검수 후 발송 가능합니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Message Type */}
          <div>
            <Label>메시지 유형</Label>
            <Select
              value={formData.messageType}
              onValueChange={(v) => handleChange('messageType', v as KakaoMessageType)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BA">기본형</SelectItem>
                <SelectItem value="EX">부가정보형</SelectItem>
                <SelectItem value="AD">광고추가형</SelectItem>
                <SelectItem value="MI">복합형</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Emphasize Type */}
          <div>
            <Label>강조 유형</Label>
            <Select
              value={formData.emphasizeType}
              onValueChange={(v) => handleChange('emphasizeType', v as KakaoEmphasizeType)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">없음</SelectItem>
                <SelectItem value="TEXT">텍스트 강조</SelectItem>
                <SelectItem value="IMAGE">이미지 강조</SelectItem>
                <SelectItem value="ITEM_LIST">아이템 리스트</SelectItem>
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
            {isEditing ? '수정 및 재검수 요청' : '등록 및 검수 요청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
