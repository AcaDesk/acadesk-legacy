'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { EmptyState } from '@ui/empty-state'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { Alert, AlertDescription } from '@ui/alert'
import { Skeleton } from '@ui/skeleton'
import { Separator } from '@ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Plus,
  FileText,
  RefreshCw,
  Trash2,
  Edit,
  Loader2,
  Send,
  XCircle,
  Info,
} from 'lucide-react'
import { KakaoTalkPreview } from '@/components/features/messaging/KakaoTalkPreview'
import { useToast } from '@/hooks/use-toast'
import {
  getKakaoTemplates,
  deleteKakaoTemplate,
  refreshTemplateStatus,
  requestKakaoTemplateInspection,
  cancelKakaoTemplateInspection,
  type KakaoTemplate,
} from '@/app/actions/messaging/kakao-templates'
import {
  kakaoTemplateStatusConfig,
  kakaoMessageTypeLabels,
} from '@/lib/kakao/kakao-status-config'
import type { KakaoTemplateSummary } from '@/components/features/settings/kakao-channel'

interface KakaoTemplateListProps {
  hasChannel: boolean
  onCreateTemplate?: () => void
  onEditTemplate?: (template: KakaoTemplate) => void
  onTemplatesLoaded?: (summary: KakaoTemplateSummary) => void
}

function extractTemplateVariables(content: string): string[] {
  const matches = content.match(/#{([^}]+)}/g) || []
  return Array.from(new Set(matches.map((m) => m.slice(2, -1))))
}

function buildTemplateSummary(templates: KakaoTemplate[]): KakaoTemplateSummary {
  return {
    total: templates.length,
    approved: templates.filter((t) => t.status === 'approved').length,
    inspecting: templates.filter((t) => t.status === 'inspecting').length,
    rejected: templates.filter((t) => t.status === 'rejected').length,
    pending: templates.filter((t) => t.status === 'pending').length,
  }
}

export function KakaoTemplateList({
  hasChannel,
  onCreateTemplate,
  onEditTemplate,
  onTemplatesLoaded,
}: KakaoTemplateListProps) {
  const { toast } = useToast()

  const [templates, setTemplates] = useState<KakaoTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionTemplateId, setActionTemplateId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<KakaoTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<KakaoTemplate | null>(null)

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getKakaoTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
        onTemplatesLoaded?.(buildTemplateSummary(result.data))
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onTemplatesLoaded])

  // Load templates
  useEffect(() => {
    if (hasChannel) {
      loadTemplates()
    } else {
      setIsLoading(false)
    }
  }, [hasChannel, loadTemplates])

  async function handleRefreshStatus(template: KakaoTemplate) {
    setActionTemplateId(template.id)
    try {
      const result = await refreshTemplateStatus(template.id)

      if (!result.success) {
        throw new Error(result.error || '상태 갱신 실패')
      }

      if (result.data) {
        setTemplates((prev) => {
          const updated = prev.map((t) => (t.id === template.id ? result.data! : t))
          onTemplatesLoaded?.(buildTemplateSummary(updated))
          return updated
        })
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
    } finally {
      setActionTemplateId(null)
    }
  }

  async function handleRequestInspection(template: KakaoTemplate) {
    setActionTemplateId(template.id)
    try {
      const result = await requestKakaoTemplateInspection(template.id)

      if (!result.success) {
        throw new Error(result.error || '검수 요청 실패')
      }

      if (result.data) {
        setTemplates((prev) => {
          const updated = prev.map((t) => (t.id === template.id ? result.data! : t))
          onTemplatesLoaded?.(buildTemplateSummary(updated))
          return updated
        })
      }

      toast({
        title: '검수 요청 완료',
        description: '카카오 검수가 시작되었습니다.',
      })
    } catch (error) {
      toast({
        title: '검수 요청 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setActionTemplateId(null)
    }
  }

  async function handleCancelInspection(template: KakaoTemplate) {
    setActionTemplateId(template.id)
    try {
      const result = await cancelKakaoTemplateInspection(template.id)

      if (!result.success) {
        throw new Error(result.error || '검수 취소 실패')
      }

      if (result.data) {
        setTemplates((prev) => {
          const updated = prev.map((t) => (t.id === template.id ? result.data! : t))
          onTemplatesLoaded?.(buildTemplateSummary(updated))
          return updated
        })
      }

      toast({
        title: '검수 취소 완료',
        description: '템플릿을 다시 수정할 수 있습니다.',
      })
    } catch (error) {
      toast({
        title: '검수 취소 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setActionTemplateId(null)
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

      setTemplates((prev) => {
        const updated = prev.filter((t) => t.id !== templateToDelete.id)
        onTemplatesLoaded?.(buildTemplateSummary(updated))
        return updated
      })
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
                승인된 템플릿만 실제 발송에 사용할 수 있습니다
              </CardDescription>
            </div>
            <Button size="sm" onClick={onCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              새 템플릿
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="등록된 템플릿이 없습니다"
              description="템플릿을 저장하면 카카오 검수를 요청합니다. 승인된 뒤 발송할 수 있습니다."
              action={
                <Button onClick={onCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 템플릿
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {templates.some((template) => template.status === 'pending') && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    대기 상태 템플릿은 아직 검수가 시작되지 않았습니다. 검수 요청을 눌러 카카오 심사를 시작하세요.
                  </AlertDescription>
                </Alert>
              )}

              {/* 카드 리스트 — 좁은 화면에서도 안 찌그러짐 */}
              <div className="space-y-2">
                {templates.map((template) => {
                  const status = kakaoTemplateStatusConfig[template.status]
                  const StatusIcon = status.icon
                  const isBusy = actionTemplateId === template.id
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setPreviewTemplate(template)}
                      disabled={isBusy}
                      className="block w-full text-left rounded-md border p-3 transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-progress"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={status.variant} className="gap-1 text-[10px] h-5">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {kakaoMessageTypeLabels[template.messageType]}
                        </Badge>
                        {template.sharedTemplateId && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            공용
                          </Badge>
                        )}
                        {isBusy && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(template.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="font-medium text-sm mt-1.5 truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {template.content}
                      </p>
                      {template.status === 'rejected' && template.rejectionReason && (
                        <p className="text-xs text-destructive mt-1.5 line-clamp-2">
                          {template.rejectionReason}
                        </p>
                      )}
                      {template.status === 'pending' && (
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          검수 요청 필요 — 카드 열어 요청하세요
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
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

      {/* 템플릿 상세 Dialog (미리보기 + 액션) */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-md">
          {previewTemplate && (() => {
            const detailStatus = kakaoTemplateStatusConfig[previewTemplate.status]
            const DetailStatusIcon = detailStatus.icon
            const detailCanEdit =
              (previewTemplate.status === 'pending' ||
                previewTemplate.status === 'rejected') &&
              !previewTemplate.sharedTemplateId
            const isBusy = actionTemplateId === previewTemplate.id
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{previewTemplate.name}</DialogTitle>
                  <DialogDescription>
                    실제 발송 시 보호자가 받는 알림톡 화면입니다.
                  </DialogDescription>
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <Badge variant={detailStatus.variant} className="gap-1">
                      <DetailStatusIcon className="h-3 w-3" />
                      {detailStatus.label}
                    </Badge>
                    <Badge variant="outline">
                      {kakaoMessageTypeLabels[previewTemplate.messageType]}
                    </Badge>
                    {previewTemplate.sharedTemplateId && (
                      <Badge variant="secondary">공용</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      등록 {new Date(previewTemplate.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </DialogHeader>

                {previewTemplate.status === 'rejected' && previewTemplate.rejectionReason && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {previewTemplate.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                <KakaoTalkPreview
                  content={previewTemplate.content}
                  variables={extractTemplateVariables(previewTemplate.content)}
                />

                <Separator />

                <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshStatus(previewTemplate)}
                    disabled={isBusy}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    상태 갱신
                  </Button>
                  {previewTemplate.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleRequestInspection(previewTemplate)}
                      disabled={isBusy}
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      검수 요청
                    </Button>
                  )}
                  {previewTemplate.status === 'inspecting' && !previewTemplate.sharedTemplateId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelInspection(previewTemplate)}
                      disabled={isBusy}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      검수 취소
                    </Button>
                  )}
                  {detailCanEdit && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const t = previewTemplate
                          setPreviewTemplate(null)
                          onEditTemplate?.(t)
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleDeleteClick(previewTemplate)
                        }}
                        className="text-destructive hover:text-destructive ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        삭제
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
