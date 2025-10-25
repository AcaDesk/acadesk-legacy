'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Plus, Edit, Trash2, MessageSquare, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from '@/app/actions/messages'
import { getErrorMessage } from '@/lib/error-handlers'

interface MessageTemplate {
  id: string
  name: string
  content: string
  type: 'sms'  // Email removed - SMS/알림톡 only
  category: string
  created_at: string
}

interface ManageTemplatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageTemplatesDialog({
  open,
  onOpenChange,
}: ManageTemplatesDialogProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    type: 'sms' as const,  // Email removed - SMS/알림톡 only
    category: 'general' as 'general' | 'report' | 'todo' | 'attendance' | 'event' | 'payment' | 'consultation',
  })
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadTemplates() {
    try {
      setLoading(true)
      const result = await getMessageTemplates()

      if (!result.success || !result.data) {
        const errorMsg = result.error || '템플릿 로드 실패'

        // Provide more helpful error message for permission issues
        if (errorMsg.includes('권한') || errorMsg.includes('인증')) {
          throw new Error(
            `${errorMsg}\n\n확인사항:\n` +
            '1. 로그인 상태를 확인하세요\n' +
            '2. Staff 권한(원장, 강사, 조교)이 있는지 확인하세요\n' +
            '3. Tenant가 올바르게 설정되어 있는지 확인하세요'
          )
        }

        throw new Error(errorMsg)
      }

      setTemplates(result.data)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: '템플릿 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function startCreating() {
    setCreating(true)
    setEditingTemplate(null)
    setFormData({
      name: '',
      content: '',
      type: 'sms',
      category: 'general',
    })
  }

  function startEditing(template: MessageTemplate) {
    setEditingTemplate(template)
    setCreating(false)
    setFormData({
      name: template.name,
      content: template.content,
      type: template.type,
      category: template.category as any,
    })
  }

  function cancelEditing() {
    setEditingTemplate(null)
    setCreating(false)
    setFormData({
      name: '',
      content: '',
      type: 'sms',
      category: 'general',
    })
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: '입력 오류',
        description: '템플릿 이름과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      let result

      if (editingTemplate) {
        result = await updateMessageTemplate(editingTemplate.id, formData)
      } else {
        result = await createMessageTemplate(formData)
      }

      if (!result.success) {
        throw new Error(result.error || '템플릿 저장 실패')
      }

      toast({
        title: editingTemplate ? '템플릿 수정 완료' : '템플릿 생성 완료',
        description: `${formData.name} 템플릿이 저장되었습니다.`,
      })

      await loadTemplates()
      cancelEditing()
    } catch (error) {
      console.error('Error saving template:', error)
      toast({
        title: '저장 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(template: MessageTemplate) {
    if (!confirm(`"${template.name}" 템플릿을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const result = await deleteMessageTemplate(template.id)

      if (!result.success) {
        throw new Error(result.error || '템플릿 삭제 실패')
      }

      toast({
        title: '템플릿 삭제 완료',
        description: `${template.name} 템플릿이 삭제되었습니다.`,
      })

      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: '일반',
      report: '리포트',
      todo: '과제',
      attendance: '출결',
      event: '행사',
    }
    return labels[category] || category
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>메시지 템플릿 관리</DialogTitle>
          <DialogDescription>
            자주 사용하는 메시지를 템플릿으로 저장하고 관리하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create/Edit Form */}
          {(creating || editingTemplate) && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">템플릿 이름 *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="예: 월간 리포트 발송"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="template-type">전송 방법 *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as 'sms' | 'email' })
                    }
                  >
                    <SelectTrigger id="template-type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">이메일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-category">카테고리</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category: value as typeof formData.category,
                    })
                  }
                >
                  <SelectTrigger id="template-category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">일반</SelectItem>
                    <SelectItem value="report">리포트</SelectItem>
                    <SelectItem value="todo">과제</SelectItem>
                    <SelectItem value="attendance">출결</SelectItem>
                    <SelectItem value="event">행사</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-content">메시지 내용 *</Label>
                <Textarea
                  id="template-content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="템플릿 내용을 입력하세요"
                  rows={formData.type === 'sms' ? 4 : 6}
                  className="mt-1"
                />
                {formData.type === 'sms' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.content.length}자
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={cancelEditing}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? '저장 중...' : editingTemplate ? '수정' : '생성'}
                </Button>
              </div>
            </div>
          )}

          {/* Add New Button */}
          {!creating && !editingTemplate && (
            <Button onClick={startCreating} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              새 템플릿 만들기
            </Button>
          )}

          {/* Template List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                로딩 중...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>등록된 템플릿이 없습니다</p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge
                          variant={
                            template.type === 'sms' ? 'default' : 'outline'
                          }
                        >
                          {template.type === 'sms' ? (
                            <>
                              <MessageSquare className="h-3 w-3 mr-1" />
                              SMS
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3 mr-1" />
                              이메일
                            </>
                          )}
                        </Badge>
                        <Badge variant="secondary">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
