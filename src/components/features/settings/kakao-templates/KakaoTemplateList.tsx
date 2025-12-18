'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { EmptyState } from '@ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  Plus,
  MoreHorizontal,
  FileText,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getKakaoTemplates,
  deleteKakaoTemplate,
  syncKakaoTemplates,
  refreshTemplateStatus,
  type KakaoTemplate,
} from '@/app/actions/kakao-templates'
import type { KakaoTemplateStatus } from '@/infra/messaging/types/kakao.types'

interface KakaoTemplateListProps {
  hasChannel: boolean
  onCreateTemplate?: () => void
  onEditTemplate?: (template: KakaoTemplate) => void
}

const statusConfig: Record<
  KakaoTemplateStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Check }
> = {
  approved: { label: '승인됨', variant: 'default', icon: Check },
  inspecting: { label: '검수 중', variant: 'secondary', icon: Clock },
  pending: { label: '대기', variant: 'outline', icon: AlertCircle },
  rejected: { label: '반려됨', variant: 'destructive', icon: XCircle },
  suspended: { label: '중지됨', variant: 'destructive', icon: XCircle },
}

export function KakaoTemplateList({
  hasChannel,
  onCreateTemplate,
  onEditTemplate,
}: KakaoTemplateListProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [templates, setTemplates] = useState<KakaoTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<KakaoTemplate | null>(null)

  // Load templates
  useEffect(() => {
    if (hasChannel) {
      loadTemplates()
    } else {
      setIsLoading(false)
    }
  }, [hasChannel])

  async function loadTemplates() {
    setIsLoading(true)
    try {
      const result = await getKakaoTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    try {
      const result = await syncKakaoTemplates()

      if (!result.success) {
        throw new Error(result.error || '동기화 실패')
      }

      toast({
        title: '동기화 완료',
        description: `${result.syncedCount}개의 템플릿이 동기화되었습니다.`,
      })

      loadTemplates()
    } catch (error) {
      toast({
        title: '동기화 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleRefreshStatus(template: KakaoTemplate) {
    try {
      const result = await refreshTemplateStatus(template.id)

      if (!result.success) {
        throw new Error(result.error || '상태 갱신 실패')
      }

      if (result.data) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? result.data! : t))
        )
      }

      toast({
        title: '상태 갱신',
        description: '템플릿 상태가 갱신되었습니다.',
      })
    } catch (error) {
      toast({
        title: '갱신 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    }
  }

  function handleDeleteClick(template: KakaoTemplate) {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!templateToDelete) return

    setDeletingId(templateToDelete.id)
    try {
      const result = await deleteKakaoTemplate(templateToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '삭제 실패')
      }

      toast({
        title: '삭제 완료',
        description: '템플릿이 삭제되었습니다.',
      })

      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    }
  }

  if (!hasChannel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">알림톡 템플릿</CardTitle>
          <CardDescription>카카오 채널을 먼저 연동해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="채널 연동 필요"
            description="알림톡 템플릿을 사용하려면 먼저 카카오 채널을 연동해주세요."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">알림톡 템플릿</CardTitle>
              <CardDescription>
                등록된 알림톡 템플릿을 관리합니다 (승인된 템플릿만 발송 가능)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                동기화
              </Button>
              <Button size="sm" onClick={onCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                템플릿 추가
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="등록된 템플릿이 없습니다"
              description="알림톡을 발송하려면 먼저 템플릿을 등록해주세요."
              action={
                <Button onClick={onCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  템플릿 추가
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>템플릿 이름</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const status = statusConfig[template.status]
                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {template.content.substring(0, 50)}
                            {template.content.length > 50 && '...'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.messageType === 'BA' && '기본형'}
                          {template.messageType === 'EX' && '부가정보형'}
                          {template.messageType === 'AD' && '광고추가형'}
                          {template.messageType === 'MI' && '복합형'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={status.variant} className="w-fit gap-1">
                            <status.icon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          {template.status === 'rejected' && template.rejectionReason && (
                            <p className="text-xs text-destructive">{template.rejectionReason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(template.createdAt).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRefreshStatus(template)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              상태 갱신
                            </DropdownMenuItem>
                            {(template.status === 'pending' || template.status === 'rejected') && (
                              <>
                                <DropdownMenuItem onClick={() => onEditTemplate?.(template)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(template)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="템플릿을 삭제하시겠습니까?"
        description={`"${templateToDelete?.name}" 템플릿을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="destructive"
        isLoading={deletingId === templateToDelete?.id}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
