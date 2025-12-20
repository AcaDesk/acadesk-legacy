'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Info, Sparkles, Lock } from 'lucide-react'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
} from '@/app/actions/report-templates'
import type {
  ReportTemplate,
  ReportTemplateCategory,
  CreateReportTemplateInput,
  UpdateReportTemplateInput,
} from '@/core/types/report-template.types'
import {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TEMPLATE_VARIABLES,
} from '@/core/types/report-template.types'

interface ReportTemplatesClientProps {
  tenantTemplates: ReportTemplate[]
  systemTemplates: ReportTemplate[]
}

const CATEGORIES: ReportTemplateCategory[] = ['summary', 'strengths', 'improvements', 'nextGoals']

export function ReportTemplatesClient({
  tenantTemplates: initialTenantTemplates,
  systemTemplates,
}: ReportTemplatesClientProps) {
  const { toast } = useToast()
  const [tenantTemplates, setTenantTemplates] = useState(initialTenantTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<ReportTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<{
    category: ReportTemplateCategory
    title: string
    content: string
  }>({
    category: 'summary',
    title: '',
    content: '',
  })

  // Open dialog for creating new template
  function handleOpenCreate() {
    setEditingTemplate(null)
    setFormData({
      category: 'summary',
      title: '',
      content: '',
    })
    setIsDialogOpen(true)
  }

  // Open dialog for editing template
  function handleOpenEdit(template: ReportTemplate) {
    setEditingTemplate(template)
    setFormData({
      category: template.category,
      title: template.title,
      content: template.content,
    })
    setIsDialogOpen(true)
  }

  // Open delete confirmation
  function handleOpenDelete(template: ReportTemplate) {
    setDeletingTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  // Submit form (create or update)
  async function handleSubmit() {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (editingTemplate) {
        // Update
        const input: UpdateReportTemplateInput = {
          id: editingTemplate.id,
          category: formData.category,
          title: formData.title.trim(),
          content: formData.content.trim(),
        }
        const result = await updateReportTemplate(input)

        if (!result.success) {
          throw new Error(result.error || '템플릿 수정에 실패했습니다.')
        }

        // Update local state
        setTenantTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? result.data! : t))
        )

        toast({
          title: '수정 완료',
          description: '템플릿이 수정되었습니다.',
        })
      } else {
        // Create
        const input: CreateReportTemplateInput = {
          category: formData.category,
          title: formData.title.trim(),
          content: formData.content.trim(),
        }
        const result = await createReportTemplate(input)

        if (!result.success) {
          throw new Error(result.error || '템플릿 생성에 실패했습니다.')
        }

        // Update local state
        setTenantTemplates((prev) => [...prev, result.data!])

        toast({
          title: '생성 완료',
          description: '새 템플릿이 생성되었습니다.',
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error('Template submit error:', error)
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '작업에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete template
  async function handleConfirmDelete() {
    if (!deletingTemplate) return

    setIsSubmitting(true)

    try {
      const result = await deleteReportTemplate(deletingTemplate.id)

      if (!result.success) {
        throw new Error(result.error || '템플릿 삭제에 실패했습니다.')
      }

      // Update local state
      setTenantTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id))

      toast({
        title: '삭제 완료',
        description: '템플릿이 삭제되었습니다.',
      })

      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error('Template delete error:', error)
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Insert variable into content
  function insertVariable(variable: string) {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }))
  }

  // Group templates by category
  function getTemplatesByCategory(templates: ReportTemplate[], category: ReportTemplateCategory) {
    return templates.filter((t) => t.category === category)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">리포트 템플릿 관리</h1>
          <p className="text-muted-foreground">
            리포트 코멘트 작성 시 사용할 템플릿을 관리합니다.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          템플릿 추가
        </Button>
      </div>

      {/* Variable Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            변수 사용법
          </CardTitle>
          <CardDescription>
            템플릿에 변수를 사용하면 리포트 작성 시 학생 정보로 자동 치환됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variable Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">변수</th>
                  <th className="text-left px-3 py-2 font-medium">설명</th>
                  <th className="text-left px-3 py-2 font-medium">예시 값</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {TEMPLATE_VARIABLES.map((v) => (
                  <tr key={v.key}>
                    <td className="px-3 py-2">
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        {v.key}
                      </code>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{v.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">{v.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Example */}
          <div className="space-y-2">
            <p className="text-sm font-medium">사용 예시</p>
            <div className="grid gap-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">작성한 템플릿</p>
                <p className="text-sm font-mono">
                  {'{studentName}'} 학생은 출석률 {'{attendanceRate}'}%로 성실하게 수업에 참여했습니다.
                </p>
              </div>
              <div className="flex justify-center">
                <span className="text-muted-foreground text-xs">↓ 리포트 작성 시 자동 변환</span>
              </div>
              <div className="rounded-lg bg-primary/5 border-primary/20 border p-3">
                <p className="text-xs text-muted-foreground mb-1">실제 출력 결과</p>
                <p className="text-sm">
                  <span className="text-primary font-medium">홍길동</span> 학생은 출석률 <span className="text-primary font-medium">95</span>%로 성실하게 수업에 참여했습니다.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates by Category */}
      {CATEGORIES.map((category) => {
        const tenantCategoryTemplates = getTemplatesByCategory(tenantTemplates, category)
        const systemCategoryTemplates = getTemplatesByCategory(systemTemplates, category)

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{CATEGORY_ICONS[category]}</span>
                {CATEGORY_LABELS[category]}
                <Badge variant="secondary" className="ml-2">
                  {tenantCategoryTemplates.length + systemCategoryTemplates.length}개
                </Badge>
              </CardTitle>
              <CardDescription>
                {category === 'summary' && '이번 달 학습 상황에 대한 전반적인 평가'}
                {category === 'strengths' && '학생이 잘한 점이나 긍정적인 변화'}
                {category === 'improvements' && '개선이 필요한 부분'}
                {category === 'nextGoals' && '다음 달 학습 목표'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tenant Templates */}
              {tenantCategoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(template)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* System Templates (Read-only) */}
              {systemCategoryTemplates.length > 0 && (
                <>
                  {tenantCategoryTemplates.length > 0 && <Separator className="my-4" />}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Lock className="h-3 w-3" />
                    시스템 기본 템플릿 (수정 불가)
                  </p>
                  {systemCategoryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted-foreground">
                            {template.title}
                          </span>
                          {template.conditions && (
                            <Badge variant="outline" className="text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              자동 추천
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Empty State */}
              {tenantCategoryTemplates.length === 0 && systemCategoryTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  등록된 템플릿이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '템플릿 수정' : '새 템플릿 추가'}
            </DialogTitle>
            <DialogDescription>
              리포트 코멘트 작성 시 사용할 템플릿을 {editingTemplate ? '수정' : '추가'}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    category: value as ReportTemplateCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">제목 (칩에 표시)</Label>
              <Input
                id="title"
                placeholder="예: 우수 출석"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                템플릿 선택 시 칩에 표시될 짧은 제목입니다. (최대 50자)
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">내용</Label>
              <Textarea
                id="content"
                placeholder="예: {studentName} 학생은 이번 달 출석률 {attendanceRate}%로 매우 성실하게 수업에 참여했습니다."
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={4}
                maxLength={500}
              />
              <TooltipProvider delayDuration={200}>
                <div className="flex flex-wrap gap-1 mt-2">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <Tooltip key={v.key}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => insertVariable(v.key)}
                        >
                          {v.key}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{v.label}</p>
                        <p className="text-muted-foreground">예: {v.example}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
              <p className="text-xs text-muted-foreground">
                변수 버튼을 클릭하면 자동으로 삽입됩니다. 마우스를 올려 설명을 확인하세요. (최대 500자)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : editingTemplate ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="템플릿 삭제"
        description={`"${deletingTemplate?.title}" 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
