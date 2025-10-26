'use client'

import { useState } from 'react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'
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
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PAGE_LAYOUT, TEXT_STYLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import {
  deleteConsultation,
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  addConsultationParticipant,
  removeConsultationParticipant,
} from '@/app/actions/consultations'

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
  consultation_notes?: Array<{
    id: string
    note_order: number
    category: string | null
    content: string
    created_at: string
  }>
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

export function ConsultationDetailClient({
  consultation: initialConsultation,
}: {
  consultation: Consultation
}) {
  const router = useRouter()
  const { toast } = useToast()

  const [consultation, setConsultation] = useState(initialConsultation)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<{
    id: string
    content: string
    category: string | null
  } | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('')
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false)
  const [participantType, setParticipantType] = useState<
    'instructor' | 'guardian' | 'student' | 'other'
  >('guardian')
  const [participantName, setParticipantName] = useState('')
  const [participantRole, setParticipantRole] = useState('')
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [isDeletingNote, setIsDeletingNote] = useState(false)
  const [removeParticipantDialogOpen, setRemoveParticipantDialogOpen] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null)
  const [isRemovingParticipant, setIsRemovingParticipant] = useState(false)

  const consultDate = new Date(consultation.consultation_date)
  const nextDate = consultation.next_consultation_date
    ? new Date(consultation.next_consultation_date)
    : null

  async function handleDelete() {
    try {
      const result = await deleteConsultation(consultation.id)

      if (!result.success) {
        throw new Error(result.error || '상담 삭제 실패')
      }

      toast({
        title: '삭제 완료',
        description: '상담 기록이 삭제되었습니다.',
      })

      router.push('/consultations')
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: '삭제 오류',
        description:
          error instanceof Error
            ? error.message
            : '상담을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleSaveNote() {
    if (!noteContent) {
      toast({
        title: '입력 오류',
        description: '노트 내용을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (editingNote) {
        // Update existing note
        const result = await updateConsultationNote({
          id: editingNote.id,
          content: noteContent,
          category: noteCategory || null,
        })

        if (!result.success || !result.data) {
          throw new Error(result.error || '노트 수정 실패')
        }

        // Update local state
        setConsultation((prev) => ({
          ...prev,
          consultation_notes: prev.consultation_notes?.map((note) =>
            note.id === editingNote.id
              ? { ...note, content: noteContent, category: noteCategory || null }
              : note
          ),
        }))

        toast({
          title: '수정 완료',
          description: '노트가 수정되었습니다.',
        })
      } else {
        // Create new note
        const result = await createConsultationNote({
          consultationId: consultation.id,
          content: noteContent,
          category: noteCategory || undefined,
          noteOrder: (consultation.consultation_notes?.length || 0) + 1,
        })

        if (!result.success || !result.data) {
          throw new Error(result.error || '노트 생성 실패')
        }

        // Update local state
        setConsultation((prev) => ({
          ...prev,
          consultation_notes: [
            ...(prev.consultation_notes || []),
            {
              id: result.data.id,
              note_order: result.data.note_order,
              category: result.data.category,
              content: result.data.content,
              created_at: result.data.created_at,
            },
          ],
        }))

        toast({
          title: '저장 완료',
          description: '노트가 추가되었습니다.',
        })
      }

      setNoteDialogOpen(false)
      setNoteContent('')
      setNoteCategory('')
      setEditingNote(null)
    } catch (error) {
      console.error('Note save error:', error)
      toast({
        title: '저장 오류',
        description:
          error instanceof Error
            ? error.message
            : '노트를 저장하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  function handleDeleteNote(noteId: string) {
    setNoteToDelete(noteId)
    setDeleteNoteDialogOpen(true)
  }

  async function handleConfirmDeleteNote() {
    if (!noteToDelete) return

    setIsDeletingNote(true)
    try {
      const result = await deleteConsultationNote(noteToDelete)

      if (!result.success) {
        throw new Error(result.error || '노트 삭제 실패')
      }

      // Update local state
      setConsultation((prev) => ({
        ...prev,
        consultation_notes: prev.consultation_notes?.filter(
          (note) => note.id !== noteToDelete
        ),
      }))

      toast({
        title: '삭제 완료',
        description: '노트가 삭제되었습니다.',
      })
    } catch (error) {
      console.error('Note delete error:', error)
      toast({
        title: '삭제 오류',
        description:
          error instanceof Error
            ? error.message
            : '노트를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingNote(false)
      setDeleteNoteDialogOpen(false)
      setNoteToDelete(null)
    }
  }

  function openEditNoteDialog(note: {
    id: string
    content: string
    category: string | null
  }) {
    setEditingNote(note)
    setNoteContent(note.content)
    setNoteCategory(note.category || '')
    setNoteDialogOpen(true)
  }

  function openNewNoteDialog() {
    setEditingNote(null)
    setNoteContent('')
    setNoteCategory('')
    setNoteDialogOpen(true)
  }

  async function handleAddParticipant() {
    if (!participantName && participantType !== 'guardian') {
      toast({
        title: '입력 오류',
        description: '참석자 이름을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await addConsultationParticipant({
        consultationId: consultation.id,
        participantType,
        name: participantName || undefined,
        role: participantRole || undefined,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '참석자 추가 실패')
      }

      // Update local state
      setConsultation((prev) => ({
        ...prev,
        consultation_participants: [
          ...(prev.consultation_participants || []),
          {
            id: result.data.id,
            participant_type: result.data.participant_type,
            user_id: result.data.user_id,
            guardian_id: result.data.guardian_id,
            name: result.data.name,
            role: result.data.role,
          },
        ],
      }))

      toast({
        title: '추가 완료',
        description: '참석자가 추가되었습니다.',
      })

      setParticipantDialogOpen(false)
      setParticipantName('')
      setParticipantRole('')
      setParticipantType('guardian')
    } catch (error) {
      console.error('Add participant error:', error)
      toast({
        title: '추가 오류',
        description:
          error instanceof Error
            ? error.message
            : '참석자를 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  function handleRemoveParticipant(participantId: string) {
    setParticipantToRemove(participantId)
    setRemoveParticipantDialogOpen(true)
  }

  async function handleConfirmRemoveParticipant() {
    if (!participantToRemove) return

    setIsRemovingParticipant(true)
    try {
      const result = await removeConsultationParticipant(participantToRemove)

      if (!result.success) {
        throw new Error(result.error || '참석자 제거 실패')
      }

      // Update local state
      setConsultation((prev) => ({
        ...prev,
        consultation_participants: prev.consultation_participants?.filter(
          (p) => p.id !== participantToRemove
        ),
      }))

      toast({
        title: '제거 완료',
        description: '참석자가 제거되었습니다.',
      })
    } catch (error) {
      console.error('Remove participant error:', error)
      toast({
        title: '제거 오류',
        description:
          error instanceof Error
            ? error.message
            : '참석자를 제거하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsRemovingParticipant(false)
      setRemoveParticipantDialogOpen(false)
      setParticipantToRemove(null)
    }
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
              <Link href="/consultations">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className={TEXT_STYLES.PAGE_TITLE}>{consultation.title}</h1>
                <p className={TEXT_STYLES.PAGE_DESCRIPTION}>상담 상세 정보</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 입회 처리 버튼 (신규 상담이고 아직 등록 안 된 경우에만 표시) */}
              {consultation.is_lead && !consultation.converted_to_student_id && (
                <Button
                  variant="default"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    // 학생 등록 페이지로 이동하면서 상담 정보를 query parameter로 전달
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
              {/* 입회 완료 표시 */}
              {consultation.is_lead && consultation.converted_to_student_id && (
                <Badge variant="default" className="bg-green-600 px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  입회 완료
                </Badge>
              )}
              <Link href={`/consultations/${consultation.id}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  수정
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2 text-red-600 hover:text-red-700"
                onClick={() => setDeleteDialogOpen(true)}
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
                      <Badge variant="default" className="bg-blue-600">
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
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">
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

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <StickyNote className="h-5 w-5" />
                  상담 노트
                </CardTitle>
                <Button onClick={openNewNoteDialog} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  노트 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!consultation.consultation_notes ||
              consultation.consultation_notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>상담 노트가 없습니다.</p>
                  <p className="text-sm mt-2">
                    상담 내용을 노트로 기록해보세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultation.consultation_notes.map((note) => (
                    <Card key={note.id} className="border">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {note.category && (
                              <Badge variant="outline">{note.category}</Badge>
                            )}
                            <p className="text-sm whitespace-pre-wrap">
                              {note.content}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.created_at).toLocaleString('ko-KR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditNoteDialog(note)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
                  onClick={() => setParticipantDialogOpen(true)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 상담 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? '노트 수정' : '노트 추가'}
            </DialogTitle>
            <DialogDescription>상담 내용을 노트로 기록합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>카테고리 (선택사항)</Label>
              <Input
                placeholder="예: 학습 태도, 성적 관련, 진로 상담..."
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                placeholder="상담 내용을 입력하세요..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialogOpen(false)
                setNoteContent('')
                setNoteCategory('')
                setEditingNote(null)
              }}
            >
              취소
            </Button>
            <Button onClick={handleSaveNote}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participant Dialog */}
      <Dialog
        open={participantDialogOpen}
        onOpenChange={setParticipantDialogOpen}
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
                  setParticipantType(
                    v as 'instructor' | 'guardian' | 'student' | 'other'
                  )
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
                setParticipantDialogOpen(false)
                setParticipantName('')
                setParticipantRole('')
                setParticipantType('guardian')
              }}
            >
              취소
            </Button>
            <Button onClick={handleAddParticipant}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteNoteDialogOpen}
        onOpenChange={setDeleteNoteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description="이 노트가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeletingNote}
        onConfirm={handleConfirmDeleteNote}
      />

      {/* Remove Participant Confirmation Dialog */}
      <ConfirmationDialog
        open={removeParticipantDialogOpen}
        onOpenChange={setRemoveParticipantDialogOpen}
        title="정말로 제거하시겠습니까?"
        description="이 참석자가 제거됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="제거"
        variant="destructive"
        isLoading={isRemovingParticipant}
        onConfirm={handleConfirmRemoveParticipant}
      />
    </PageWrapper>
  )
}
