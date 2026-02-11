'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import {
  Edit,
  Phone,
  Mail,
  Users as UsersIcon,
  UserCircle,
  Briefcase,
  MapPin,
  Star,
  Plus,
  Unlink,
  Search,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { formatPhoneNumber } from '@/lib/utils'
import { getGuardianRelationshipLabel } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import {
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
  togglePrimaryGuardian,
} from '@/app/actions/guardians'
import { getErrorMessage } from '@/lib/error-handlers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ui/command'

interface GuardianDetail {
  id: string
  relationship: string | null
  occupation: string | null
  address: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  student_guardians: Array<{
    is_primary: boolean
    students: {
      id: string
      student_code: string
      grade: string | null
      users: {
        name: string
      } | null
    } | null
  }>
}

interface StudentOption {
  id: string
  student_code: string
  name: string
}

interface GuardianDetailClientProps {
  guardian: GuardianDetail
  availableStudents: StudentOption[]
}

export function GuardianDetailClient({ guardian, availableStudents }: GuardianDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Unlink state
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [studentToUnlink, setStudentToUnlink] = useState<{ id: string; name: string } | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  // Add student dialog state
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false)
  const [isLinking, setIsLinking] = useState(false)

  // Primary toggle state
  const [isTogglingPrimary, setIsTogglingPrimary] = useState(false)

  // Derive connected student IDs for filtering
  const connectedStudentIds = new Set(
    guardian.student_guardians
      .map((sg) => sg.students?.id)
      .filter((id): id is string => Boolean(id))
  )

  const filteredAvailableStudents = availableStudents.filter(
    (s) => !connectedStudentIds.has(s.id)
  )

  async function handleUnlinkStudent() {
    if (!studentToUnlink) return

    setIsUnlinking(true)
    try {
      const result = await unlinkGuardianFromStudent(studentToUnlink.id, guardian.id)
      if (!result.success) {
        throw new Error(result.error || '연결 해제에 실패했습니다')
      }

      toast({
        title: '연결 해제 완료',
        description: `${studentToUnlink.name} 학생과의 연결이 해제되었습니다.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: '연결 해제 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsUnlinking(false)
      setUnlinkDialogOpen(false)
      setStudentToUnlink(null)
    }
  }

  async function handleLinkStudent(studentId: string) {
    setIsLinking(true)
    try {
      const result = await linkGuardianToStudent(
        studentId,
        guardian.id,
        guardian.relationship || 'other'
      )
      if (!result.success) {
        throw new Error(result.error || '학생 연결에 실패했습니다')
      }

      toast({
        title: '학생 연결 완료',
        description: '학생이 성공적으로 연결되었습니다.',
      })
      setAddStudentDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: '학생 연결 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsLinking(false)
    }
  }

  async function handleTogglePrimary(studentId: string, currentIsPrimary: boolean) {
    setIsTogglingPrimary(true)
    try {
      const result = await togglePrimaryGuardian(guardian.id, studentId, !currentIsPrimary)
      if (!result.success) {
        throw new Error(result.error || '주 보호자 설정에 실패했습니다')
      }

      toast({
        title: !currentIsPrimary ? '주 보호자로 설정' : '주 보호자 해제',
        description: !currentIsPrimary
          ? '해당 학생의 주 보호자로 설정되었습니다.'
          : '주 보호자 설정이 해제되었습니다.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: '주 보호자 설정 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsTogglingPrimary(false)
    }
  }

  return (
    <PageErrorBoundary pageName="보호자 상세">
      <PageWrapper
        title={guardian.users?.name || '이름 없음'}
        subtitle={`${guardian.relationship ? `${getGuardianRelationshipLabel(guardian.relationship)} · ` : ''}보호자`}
        actions={
          <RoleGuard allowedRoles={['owner', 'instructor']}>
            <Button onClick={() => router.push(`/guardians/${guardian.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </RoleGuard>
        }
      >
        <div className="space-y-6">

        {/* Basic Info Cards */}
        <SectionErrorBoundary sectionName="기본 정보">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">연락처 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guardian.users?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatPhoneNumber(guardian.users.phone)}</span>
                    </div>
                  )}
                  {guardian.users?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.users.email}</span>
                    </div>
                  )}
                  {!guardian.users?.phone && !guardian.users?.email && (
                    <p className="text-sm text-muted-foreground">연락처 정보 없음</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">관계 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  {guardian.relationship ? (
                    <Badge variant="outline">
                      {getGuardianRelationshipLabel(guardian.relationship)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">관계 정보 없음</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">추가 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guardian.occupation && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.occupation}</span>
                    </div>
                  )}
                  {guardian.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.address}</span>
                    </div>
                  )}
                  {!guardian.occupation && !guardian.address && (
                    <p className="text-sm text-muted-foreground">추가 정보 없음</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SectionErrorBoundary>

        {/* Connected Students Section */}
        <SectionErrorBoundary sectionName="연결된 학생">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>연결된 학생 목록</CardTitle>
              <RoleGuard allowedRoles={['owner', 'instructor']}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddStudentDialogOpen(true)}
                  disabled={filteredAvailableStudents.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  학생 추가
                </Button>
              </RoleGuard>
            </CardHeader>
            <CardContent>
              {guardian.student_guardians && guardian.student_guardians.length > 0 ? (
                <div className="space-y-3">
                  {guardian.student_guardians.map((sg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-4">
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {sg.students?.users?.name || '이름 없음'}
                            </div>
                            {sg.is_primary && (
                              <Badge variant="default" className="text-xs">
                                주 보호자
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {sg.students?.student_code || '학번 없음'}
                            {sg.students?.grade && ` · ${sg.students.grade}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <RoleGuard allowedRoles={['owner', 'instructor']}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={sg.is_primary ? '주 보호자 해제' : '주 보호자로 설정'}
                            disabled={isTogglingPrimary}
                            onClick={() =>
                              sg.students?.id &&
                              handleTogglePrimary(sg.students.id, sg.is_primary)
                            }
                          >
                            <Star
                              className={`h-4 w-4 ${
                                sg.is_primary
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          </Button>
                        </RoleGuard>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            sg.students?.id && router.push(`/students/${sg.students.id}`)
                          }
                        >
                          학생 상세
                        </Button>
                        <RoleGuard allowedRoles={['owner', 'instructor']}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            title="연결 해제"
                            onClick={() => {
                              if (sg.students?.id) {
                                setStudentToUnlink({
                                  id: sg.students.id,
                                  name: sg.students.users?.name || '학생',
                                })
                                setUnlinkDialogOpen(true)
                              }
                            }}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">연결된 학생이 없습니다.</p>
                  <RoleGuard allowedRoles={['owner', 'instructor']}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setAddStudentDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      학생 추가
                    </Button>
                  </RoleGuard>
                </div>
              )}
            </CardContent>
          </Card>
        </SectionErrorBoundary>
      </div>
    </PageWrapper>

    {/* Unlink Confirmation Dialog */}
    <ConfirmationDialog
      open={unlinkDialogOpen}
      onOpenChange={setUnlinkDialogOpen}
      title="학생 연결을 해제하시겠습니까?"
      description={
        studentToUnlink
          ? `"${studentToUnlink.name}" 학생과의 연결이 해제됩니다.`
          : ''
      }
      confirmText="연결 해제"
      variant="destructive"
      isLoading={isUnlinking}
      onConfirm={handleUnlinkStudent}
    />

    {/* Add Student Dialog */}
    <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
          <DialogDescription>
            보호자에게 연결할 학생을 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder="학생 이름 또는 학번으로 검색..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              <div className="flex flex-col items-center py-4">
                <Search className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredAvailableStudents.map((student) => (
                <CommandItem
                  key={student.id}
                  value={`${student.name} ${student.student_code}`}
                  onSelect={() => handleLinkStudent(student.id)}
                  disabled={isLinking}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{student.name || '이름 없음'}</div>
                      <div className="text-xs text-muted-foreground">{student.student_code}</div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
    </PageErrorBoundary>
  )
}
