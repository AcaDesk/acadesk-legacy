'use client'

import { useState } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Plus, Edit, Trash2, MessageSquare, Search, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createMessageTemplate, updateMessageTemplate, deleteMessageTemplate } from '@/app/actions/messages'
import { useRouter } from 'next/navigation'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface MessageTemplate {
  id: string
  name: string
  category: 'attendance' | 'payment' | 'report' | 'consultation' | 'general' | 'todo' | 'event'
  type: 'sms'  // Email removed - SMS/알림톡 only
  content: string
  created_at: string
  updated_at: string
}

interface MessageTemplatesClientProps {
  templates: MessageTemplate[]
}

const categoryLabels: Record<string, string> = {
  attendance: '출결',
  payment: '학원비',
  report: '리포트',
  consultation: '상담',
  general: '일반',
  todo: '과제',
  event: '이벤트',
}

// Extract variables from template content
function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

type DialogMode = 'create' | 'edit' | null

interface TemplateFormData {
  id?: string
  name: string
  category: MessageTemplate['category']
  content: string
}

export function MessageTemplatesClient({ templates }: MessageTemplatesClientProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    category: 'general',
    content: '',
  })
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function handleEdit(template: MessageTemplate) {
    setFormData({
      id: template.id,
      name: template.name,
      category: template.category,
      content: template.content,
    })
    setDialogMode('edit')
  }

  function handleDeleteClick(id: string, name: string) {
    setTemplateToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!templateToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteMessageTemplate(templateToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '삭제 실패')
      }

      toast({
        title: '삭제 완료',
        description: `${templateToDelete.name} 템플릿이 삭제되었습니다.`,
      })

      router.refresh()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  function handleCreate() {
    setFormData({
      name: '',
      category: 'general',
      content: '',
    })
    setDialogMode('create')
  }

  async function handleSubmit() {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: '입력 오류',
        description: '템플릿 이름과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      if (dialogMode === 'create') {
        const result = await createMessageTemplate({
          name: formData.name.trim(),
          category: formData.category,
          type: 'sms',
          content: formData.content.trim(),
        })

        if (!result.success) {
          throw new Error(result.error || '생성 실패')
        }

        toast({
          title: '생성 완료',
          description: '새 템플릿이 생성되었습니다.',
        })
      } else if (dialogMode === 'edit' && formData.id) {
        const result = await updateMessageTemplate(formData.id, {
          name: formData.name.trim(),
          category: formData.category,
          content: formData.content.trim(),
        })

        if (!result.success) {
          throw new Error(result.error || '수정 실패')
        }

        toast({
          title: '수정 완료',
          description: '템플릿이 수정되었습니다.',
        })
      }

      setDialogMode(null)
      setFormData({ name: '', category: 'general', content: '' })
      router.refresh()
    } catch (error) {
      toast({
        title: dialogMode === 'create' ? '생성 오류' : '수정 오류',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">알림 템플릿 관리</h1>
          <p className="text-muted-foreground">자주 사용하는 알림톡/SMS 템플릿을 관리합니다</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          템플릿 생성
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                프로세스 연동형 소통
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                여기서 만든 템플릿은 출석부, 학원비 관리, 리포트 등 모든 페이지에서 바로 사용할 수 있습니다.
                {' '}변수(예: {'{학생이름}'}, {'{금액}'})는 자동으로 실제 값으로 변환됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="템플릿 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="h-10 px-4 flex items-center">
          {filteredTemplates.length}개 템플릿
        </Badge>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>템플릿 목록</CardTitle>
          <CardDescription>
            등록된 모든 메시지 템플릿을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>등록된 템플릿이 없습니다.</p>
              {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>템플릿명</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>변수</TableHead>
                    <TableHead>내용 미리보기</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const variables = extractVariables(template.content)
                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryLabels[template.category] || template.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {variables.length > 0 ? (
                              variables.map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {'{' + variable + '}'}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">없음</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                            {template.content}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(template)}
                              disabled={loading}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(template.id, template.name)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 템플릿</CardDescription>
            <CardTitle className="text-3xl">{templates.length}개</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>출결 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'attendance').length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>학원비 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'payment').length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>리포트 템플릿</CardDescription>
            <CardTitle className="text-3xl">
              {templates.filter(t => t.category === 'report').length}개
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? '템플릿 생성' : '템플릿 수정'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'SMS/알림톡 템플릿을 생성합니다. 변수는 {변수명} 형식으로 입력하세요.'
                : '템플릿 내용을 수정합니다. 변수는 {변수명} 형식으로 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">템플릿 이름</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 결석 알림"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category">분류</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as MessageTemplate['category'] })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="attendance">출결</SelectItem>
                  <SelectItem value="payment">학원비</SelectItem>
                  <SelectItem value="report">리포트</SelectItem>
                  <SelectItem value="consultation">상담</SelectItem>
                  <SelectItem value="todo">과제</SelectItem>
                  <SelectItem value="event">이벤트</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">메시지 내용</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="안녕하세요, {학원이름}입니다.\n\n{학생이름} 학생이..."
                rows={8}
                className="mt-2 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.content.length}자 | 변수 사용 예: {'{학원이름}, {학생이름}, {날짜}, {시간}'}
              </p>
            </div>

            {formData.content && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <Label className="text-xs text-muted-foreground">변수 목록</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {extractVariables(formData.content).map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {'{' + variable + '}'}
                    </Badge>
                  ))}
                  {extractVariables(formData.content).length === 0 && (
                    <span className="text-xs text-muted-foreground">변수가 없습니다</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '처리 중...' : dialogMode === 'create' ? '생성' : '수정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="템플릿을 삭제하시겠습니까?"
        description={templateToDelete ? `"${templateToDelete.name}" 템플릿이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
