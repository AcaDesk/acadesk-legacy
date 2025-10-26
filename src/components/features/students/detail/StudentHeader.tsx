'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
import {
  Edit,
  MoreVertical,
  FileText,
  Send,
  Users,
  Trash2,
  MessageSquare,
  Award,
  Phone,
  Mail,
} from 'lucide-react'
import { getStudentAvatar } from '@/lib/avatar'
import { differenceInYears } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { RoleGuard } from '@/components/auth/role-guard'
import type { StudentDetail } from '@/core/types/studentDetail.types'
import { updateStudent, deleteStudent } from '@/app/actions/students'
// import { SendReportDialog } from './SendReportDialog' // DISABLED: Report feature migration pending

interface StudentHeaderProps {
  student: StudentDetail
  onStudentUpdate: (student: StudentDetail) => void
  onClassDialogOpen: () => void
}

export function StudentHeader({
  student,
  onStudentUpdate,
  onClassDialogOpen,
}: StudentHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // const [reportDialogOpen, setReportDialogOpen] = useState(false) // DISABLED: Report feature migration pending

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

      setProfileDialogOpen(false)
    } catch (error) {
      toast({
        title: '업데이트 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  const handleSendReport = () => {
    // DISABLED: Report feature migration pending
    // setReportDialogOpen(true)
    toast({
      title: '기능 준비 중',
      description: '보고서 전송 기능은 현재 마이그레이션 작업 중입니다.',
      variant: 'default',
    })
  }

  const handleContactGuardian = () => {
    if (!student.student_guardians || student.student_guardians.length === 0) {
      toast({
        title: '보호자 정보 없음',
        description: '등록된 보호자가 없습니다.',
        variant: 'destructive',
      })
      return
    }

    const guardian = student.student_guardians[0].guardians
    if (!guardian?.users?.phone) {
      toast({
        title: '연락처 정보 없음',
        description: '보호자 연락처가 등록되어 있지 않습니다.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: '보호자 연락',
      description: `${guardian.users.name} (${guardian.users.phone})`,
    })
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteStudent(student.id)

      if (!result.success || result.error) {
        throw new Error(result.error || '학생 삭제에 실패했습니다')
      }

      toast({
        title: '학생 삭제 완료',
        description: '학생 정보가 성공적으로 삭제되었습니다.',
      })

      router.push('/students')
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
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
            className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer relative group ring-2 ring-border"
            onClick={() => setProfileDialogOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image
              src={getStudentAvatar(
                student.profile_image_url,
                student.id,
                student.users?.name || 'Student'
              )}
              alt={student.users?.name || '학생'}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
              <DropdownMenuItem onClick={handleSendReport}>
                <Send className="h-4 w-4 mr-2" />
                리포트 발송
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleContactGuardian}>
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
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
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

      {/* Send Report Dialog */}
      {/* DISABLED: Report feature migration pending
      <SendReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        student={student}
      />
      */}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={`"${student.users?.name || '이 학생'}"의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
