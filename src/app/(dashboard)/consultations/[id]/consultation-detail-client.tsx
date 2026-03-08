'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Textarea } from '@ui/textarea'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/dialog'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  MessageSquare,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  Plus,
  Users,
  StickyNote,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PAGE_LAYOUT, TEXT_STYLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { useConsultationStore } from '@/lib/stores/consultation.store'
import {
  useDeleteConsultationMutation,
  useSaveNoteMutation,
  useAddNoteMutation,
  useDeleteNoteMutation,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
} from '@/hooks/mutations/use-consultation-mutations'

type ConsultationNote = {
  id: string
  note_order: number
  category: string | null
  content: string
  created_at: string
}

type Consultation = {
  id: string
  is_lead: boolean
  student_id: string | null
  lead_name: string | null
  lead_guardian_name: string | null
  lead_guardian_phone: string | null
  converted_to_student_id: string | null
  converted_at: string | null
  consultation_date: string
  consultation_type: string
  duration_minutes: number | null
  title: string
  summary: string | null
  outcome: string | null
  follow_up_required: boolean
  next_consultation_date: string | null
  students?: { id: string; name: string; grade: string }
  users?: { id: string; name: string }
  consultation_notes?: ConsultationNote[]
  consultation_participants?: Array<{
    id: string
    participant_type: string
    user_id: string | null
    guardian_id: string | null
    name: string | null
    role: string | null
  }>
}

const consultationTypeLabels: Record<string, string> = {
  parent_meeting: '학부모 상담',
  phone_call: '전화 상담',
  video_call: '화상 상담',
  in_person: '대면 상담',
}

const participantTypeLabels: Record<string, string> = {
  instructor: '강사',
  guardian: '학부모',
  student: '학생',
  other: '기타',
}

// 인라인 노트 편집기
function InlineNoteEditor({
  initialContent,
  initialCategory,
  onSave,
  onCancel,
  isSaving,
}: {
  initialContent: string
  initialCategory: string
  onSave: (content: string, category: string) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [content, setContent] = useState(initialContent)
  const [category, setCategory] = useState(initialCategory)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="space-y-3">
      <Input
        placeholder="카테고리 (선택사항)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="text-sm"
      />
      <Textarea
        ref={textareaRef}
        placeholder="노트 내용을 입력하세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onSave(content, category)}
          disabled={!content.trim() || isSaving}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          저장
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5 mr-1" />
          취소
        </Button>
      </div>
    </div>
  )
}

// 새 노트 추가 영역 (타임라인 하단)
function NewNoteInline({
  onAdd,
  isAdding,
}: {
  onAdd: (content: string, category: string) => void
  isAdding: boolean
}) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')

  function handleSave() {
    onAdd(content, category)
    setContent('')
    setCategory('')
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="relative flex gap-4">
        <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-dashed border-border shrink-0">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
            노트 추가
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary border-2 border-primary shrink-0">
        <Plus className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex-1 pt-1">
        <InlineNoteEditor
          initialContent={content}
          initialCategory={category}
          onSave={handleSave}
          onCancel={() => setOpen(false)}
          isSaving={isAdding}
        />
      </div>
    </div>
  )
}

export function ConsultationDetailClient({
  consultation: initialConsultation,
}: {
  consultation: Consultation
}) {
  const router = useRouter()
  const { toast } = useToast()
  const { activeDialog, setActiveDialog, closeDialog } = useConsultationStore()

  const [consultation, setConsultation] = useState(initialConsultation)

  // 인라인 노트 편집
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // 참석자 추가 폼
  const [participantType, setParticipantType] = useState<
    'instructor' | 'guardian' | 'student' | 'other'
  >('guardian')
  const [participantName, setParticipantName] = useState('')
  const [participantRole, setParticipantRole] = useState('')

  const deleteMutation = useDeleteConsultationMutation()
  const saveNoteMutation = useSaveNoteMutation({
    onSuccess: (noteId, content, category) => {
      setConsultation((prev) => ({
        ...prev,
        consultation_notes: prev.consultation_notes?.map((n) =>
          n.id === noteId ? { ...n, content, category: category || null } : n
        ),
      }))
      setEditingNoteId(null)
    },
  })
  const addNoteMutation = useAddNoteMutation({
    onSuccess: (note) => {
      setConsultation((prev) => ({
        ...prev,
        consultation_notes: [...(prev.consultation_notes || []), note],
      }))
    },
  })
  const deleteNoteMutation = useDeleteNoteMutation({
    onSuccess: (noteId) => {
      setConsultation((prev) => ({
        ...prev,
        consultation_notes: prev.consultation_notes?.filter((n) => n.id !== noteId),
      }))
    },
  })
  const addParticipantMutation = useAddParticipantMutation({
    onSuccess: (participant) => {
      setConsultation((prev) => ({
        ...prev,
        consultation_participants: [...(prev.consultation_participants || []), participant],
      }))
      closeDialog()
      setParticipantName('')
      setParticipantRole('')
      setParticipantType('guardian')
    },
  })
  const removeParticipantMutation = useRemoveParticipantMutation({
    onSuccess: (participantId) => {
      setConsultation((prev) => ({
        ...prev,
        consultation_participants: prev.consultation_participants?.filter(
          (p) => p.id !== participantId
        ),
      }))
    },
  })

  const consultDate = new Date(consultation.consultation_date)
  const nextDate = consultation.next_consultation_date
    ? new Date(consultation.next_consultation_date)
    : null

  function handleDelete() {
    deleteMutation.mutate(consultation.id, { onSettled: closeDialog })
  }

  function handleSaveNoteEdit(noteId: string, content: string, category: string) {
    if (!content.trim()) {
      toast({ title: '입력 오류', description: '노트 내용을 입력해주세요.', variant: 'destructive' })
      return
    }
    saveNoteMutation.mutate({ noteId, content, category })
  }

  function handleAddNote(content: string, category: string) {
    if (!content.trim()) {
      toast({ title: '입력 오류', description: '노트 내용을 입력해주세요.', variant: 'destructive' })
      return
    }
    addNoteMutation.mutate({
      consultationId: consultation.id,
      content,
      category,
      noteOrder: (consultation.consultation_notes?.length || 0) + 1,
    })
  }

  function handleDeleteNote(noteId: string) {
    setActiveDialog({ type: 'deleteNote', noteId })
  }

  function handleConfirmDeleteNote() {
    if (activeDialog?.type !== 'deleteNote') return
    deleteNoteMutation.mutate(activeDialog.noteId, { onSettled: closeDialog })
  }

  function handleAddParticipant() {
    if (!participantName.trim()) {
      toast({ title: '입력 오류', description: '참석자 이름을 입력해주세요.', variant: 'destructive' })
      return
    }
    addParticipantMutation.mutate({
      consultationId: consultation.id,
      participantType,
      name: participantName.trim(),
      role: participantRole || undefined,
    })
  }

  function handleRemoveParticipant(participantId: string) {
    setActiveDialog({ type: 'removeParticipant', participantId })
  }

  function handleConfirmRemoveParticipant() {
    if (activeDialog?.type !== 'removeParticipant') return
    removeParticipantMutation.mutate(activeDialog.participantId, { onSettled: closeDialog })
  }

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/consultations">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className={TEXT_STYLES.PAGE_TITLE}>{consultation.title}</h1>
                <p className={TEXT_STYLES.PAGE_DESCRIPTION}>상담 상세 정보</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {consultation.is_lead && !consultation.converted_to_student_id && (
                <Button
                  variant="default"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const params = new URLSearchParams({
                      fromConsultation: consultation.id,
                      name: consultation.lead_name || '',
                      guardianName: consultation.lead_guardian_name || '',
                      guardianPhone: consultation.lead_guardian_phone || '',
                    })
                    router.push(`/students/new?${params.toString()}`)
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  입회 처리하기
                </Button>
              )}
              {consultation.is_lead && consultation.converted_to_student_id && (
                <Badge variant="default" className="bg-green-600 px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  입회 완료
                </Badge>
              )}
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/consultations/${consultation.id}/edit`}>
                  <Edit className="h-4 w-4" />
                  수정
                </Link>
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => setActiveDialog({ type: 'deleteConsultation' })}
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5" />
                  상담 정보
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {consultationTypeLabels[consultation.consultation_type] ||
                      consultation.consultation_type}
                  </Badge>
                  {consultation.follow_up_required && (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      후속 상담 필요
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">
                    {consultation.is_lead ? '잠재 고객' : '학생'}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {consultation.is_lead
                        ? consultation.lead_name || '정보 없음'
                        : consultation.students?.name || '정보 없음'}
                    </span>
                    {consultation.is_lead ? (
                      <Badge variant="default" className="bg-info">
                        신규
                      </Badge>
                    ) : (
                      consultation.students?.grade && (
                        <Badge variant="outline" className="ml-2">
                          {consultation.students.grade}
                        </Badge>
                      )
                    )}
                  </div>
                  {consultation.is_lead && consultation.lead_guardian_name && (
                    <div className="text-sm text-muted-foreground mt-2">
                      학부모: {consultation.lead_guardian_name}
                      {consultation.lead_guardian_phone && (
                        <span className="ml-2">({consultation.lead_guardian_phone})</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">진행자</div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{consultation.users?.name || '정보 없음'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">상담 날짜</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {consultDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">상담 시간</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {consultDate.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {consultation.duration_minutes &&
                        ` (${consultation.duration_minutes}분)`}
                    </span>
                  </div>
                </div>

                {nextDate && (
                  <div className="space-y-1 col-span-2">
                    <div className="text-sm text-muted-foreground">
                      다음 상담 예정일
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-info" />
                      <span className="text-info font-medium">
                        {nextDate.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {consultation.summary && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="text-sm font-medium">상담 요약</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {consultation.summary}
                  </p>
                </div>
              )}

              {consultation.outcome && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    상담 결과
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {consultation.outcome}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notes - Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <StickyNote className="h-5 w-5" />
                상담 노트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* 수직 연결선 */}
                {(consultation.consultation_notes?.length ?? 0) > 0 && (
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                )}

                <div className="space-y-0">
                  {(!consultation.consultation_notes || consultation.consultation_notes.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground">
                      <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">상담 노트가 없습니다.</p>
                      <p className="text-xs mt-1">아래에서 첫 노트를 추가해보세요.</p>
                    </div>
                  )}

                  {consultation.consultation_notes?.map((note) => (
                    <div key={note.id} className="relative flex gap-4 pb-6">
                      {/* 타임라인 노드 */}
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-border shrink-0">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>

                      {/* 노트 내용 */}
                      <div className="flex-1 pt-0.5 min-w-0">
                        {editingNoteId === note.id ? (
                          <InlineNoteEditor
                            initialContent={note.content}
                            initialCategory={note.category || ''}
                            onSave={(content, category) => handleSaveNoteEdit(note.id, content, category)}
                            onCancel={() => setEditingNoteId(null)}
                            isSaving={saveNoteMutation.isPending}
                          />
                        ) : (
                          <div className="group rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1 min-w-0">
                                {note.category && (
                                  <Badge variant="outline" className="text-xs">{note.category}</Badge>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(note.created_at).toLocaleString('ko-KR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingNoteId(note.id)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleDeleteNote(note.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 새 노트 추가 */}
                  <NewNoteInline onAdd={handleAddNote} isAdding={addNoteMutation.isPending} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  참석자
                </CardTitle>
                <Button
                  onClick={() => setActiveDialog({ type: 'addParticipant' })}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  참석자 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!consultation.consultation_participants ||
              consultation.consultation_participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>참석자가 없습니다.</p>
                  <p className="text-sm mt-2">상담 참석자를 추가해보세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {consultation.consultation_participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {participantTypeLabels[participant.participant_type] ||
                            participant.participant_type}
                        </Badge>
                        <span className="font-medium">
                          {participant.name || '이름 없음'}
                        </span>
                        {participant.role && (
                          <span className="text-sm text-muted-foreground">
                            ({participant.role})
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveParticipant(participant.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 상담 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        open={activeDialog?.type === 'deleteConsultation'}
        onOpenChange={(open) => !open && closeDialog()}
        title="상담 기록 삭제"
        description="이 상담 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      {/* 참석자 추가 다이얼로그 */}
      <Dialog
        open={activeDialog?.type === 'addParticipant'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>참석자 추가</DialogTitle>
            <DialogDescription>상담 참석자를 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>참석자 유형</Label>
              <Select
                value={participantType}
                onValueChange={(v) =>
                  setParticipantType(v as 'instructor' | 'guardian' | 'student' | 'other')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guardian">학부모</SelectItem>
                  <SelectItem value="instructor">강사</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>이름</Label>
              <Input
                placeholder="참석자 이름"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>역할 (선택사항)</Label>
              <Input
                placeholder="예: 어머니, 담임 강사..."
                value={participantRole}
                onChange={(e) => setParticipantRole(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                closeDialog()
                setParticipantName('')
                setParticipantRole('')
                setParticipantType('guardian')
              }}
            >
              취소
            </Button>
            <Button onClick={handleAddParticipant} disabled={addParticipantMutation.isPending}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 노트 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        open={activeDialog?.type === 'deleteNote'}
        onOpenChange={(open) => !open && closeDialog()}
        title="정말로 삭제하시겠습니까?"
        description="이 노트가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteNoteMutation.isPending}
        onConfirm={handleConfirmDeleteNote}
      />

      {/* 참석자 제거 확인 다이얼로그 */}
      <ConfirmationDialog
        open={activeDialog?.type === 'removeParticipant'}
        onOpenChange={(open) => !open && closeDialog()}
        title="정말로 제거하시겠습니까?"
        description="이 참석자가 제거됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="제거"
        variant="destructive"
        isLoading={removeParticipantMutation.isPending}
        onConfirm={handleConfirmRemoveParticipant}
      />
    </PageWrapper>
  )
}
