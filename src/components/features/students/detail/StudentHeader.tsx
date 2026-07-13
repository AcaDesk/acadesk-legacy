'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { getErrorMessage } from '@/lib/error-handlers'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { ProfileImageUpload } from '@ui/profile-image-upload'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { StudentAvatar } from '@ui/student-avatar'
import {
  Edit,
  MoreVertical,
  Users,
  Trash2,
  MessageSquare,
  Phone,
  Mail,
} from 'lucide-react'
import { differenceInYears } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { RoleGuard } from '@/components/auth/role-guard'
import type { StudentDetail } from '@/core/types/studentDetail.types'
import { updateStudent, deleteStudent } from '@/app/actions/students'
import { SendAlimtalkMenu } from '@/components/features/messaging/SendAlimtalkMenu'

interface StudentHeaderProps {
  student: StudentDetail
  onStudentUpdate: (student: StudentDetail) => void
  onClassDialogOpen: () => void
}

// 학생 헤더 다이얼로그 통합 상태 (discriminated union)
type ActiveDialog = { type: 'profile' } | { type: 'delete' }

export function StudentHeader({
  student,
  onStudentUpdate,
  onClassDialogOpen,
}: StudentHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)
  const closeDialog = () => setActiveDialog(null)

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    return differenceInYears(new Date(), new Date(birthDate))
  }

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return null
    const labels: Record<string, string> = {
      male: '남성',
      female: '여성',
      other: '기타',
    }
    return labels[gender] || gender
  }

  const handleProfileImageUpdate = async (url: string) => {
    try {
      const result = await updateStudent(student.id, {
        profile_image_url: url,
      })

      if (!result.success || result.error) {
        throw new Error(result.error || '프로필 이미지 업데이트에 실패했습니다')
      }

      onStudentUpdate({
        ...student,
        profile_image_url: url,
      })

      toast({
        title: '프로필 업데이트',
        description: '프로필 사진이 업데이트되었습니다.',
      })

      closeDialog()
    } catch (error) {
      toast({
        title: '업데이트 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleAddConsultation = () => {
    router.push(`/consultations/new?studentId=${student.id}`)
  }

  const handleDeleteClick = () => {
    setActiveDialog({ type: 'delete' })
  }

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await deleteStudent(student.id)
      if (!result.success || result.error) {
        throw new Error(result.error || '학생 삭제에 실패했습니다')
      }
    },
    onSuccess: () => {
      toast({ title: '학생 삭제 완료', description: '학생 정보가 성공적으로 삭제되었습니다.' })
      router.push('/students')
    },
    onError: (error) => {
      toast({ title: '삭제 실패', description: getErrorMessage(error), variant: 'destructive' })
    },
    onSettled: () => closeDialog(),
  })

  const handleConfirmDelete = () => {
    deleteMutation.mutate()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-4">
          {/* Profile Image */}
          <motion.div
            className="cursor-pointer relative group"
            onClick={() => setActiveDialog({ type: 'profile' })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <StudentAvatar
              profileImageUrl={student.profile_image_url}
              studentId={student.id}
              studentName={student.users?.name || 'Student'}
              size="lg"
              className="ring-2 ring-border"
            />
            <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Edit className="h-5 w-5 text-background" />
            </div>
          </motion.div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {student.users?.name || '이름 없음'}
              </h1>
              {student.gender && (
                <Badge variant="outline" className="text-xs">
                  {getGenderLabel(student.gender)}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {student.grade || '-'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{student.student_code}</span>
              {student.birth_date && (
                <>
                  <span>•</span>
                  <span>{calculateAge(student.birth_date)}세</span>
                </>
              )}
              {student.student_phone && (
                <>
                  <span>•</span>
                  <span>{student.student_phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          {/* Quick Contact Buttons */}
          {student.student_guardians &&
            student.student_guardians.length > 0 &&
            student.student_guardians[0].guardians?.users?.phone && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const phone = student.student_guardians[0].guardians?.users?.phone
                  if (phone) window.open(`tel:${phone}`)
                }}
                title="보호자에게 전화"
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}

          {student.users?.email && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (student.users?.email)
                  window.open(`mailto:${student.users.email}`)
              }}
              title="이메일 보내기"
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}

          <RoleGuard allowedRoles={['owner', 'instructor']}>
            <SendAlimtalkMenu studentId={student.id} />

            <Button
              variant="outline"
              className="gap-2"
              onClick={onClassDialogOpen}
            >
              <Users className="h-4 w-4" />
              수강반 관리
            </Button>

            <Button
              onClick={() => router.push(`/students/${student.id}/edit`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              편집
            </Button>
          </RoleGuard>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleAddConsultation}>
                <MessageSquare className="h-4 w-4 mr-2" />
                상담 기록 추가
              </DropdownMenuItem>
              <RoleGuard allowedRoles={['owner']}>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  학생 삭제
                </DropdownMenuItem>
              </RoleGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Profile Image Upload Dialog */}
      <Dialog open={activeDialog?.type === 'profile'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로필 사진 변경</DialogTitle>
            <DialogDescription>
              새로운 프로필 사진을 업로드하거나 기존 사진을 제거할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <ProfileImageUpload
            currentImageUrl={student.profile_image_url}
            onImageUploaded={handleProfileImageUpdate}
            studentId={student.id}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={activeDialog?.type === 'delete'}
        onOpenChange={(open) => !open && closeDialog()}
        title="정말로 삭제하시겠습니까?"
        description={`"${student.users?.name || '이 학생'}"의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
