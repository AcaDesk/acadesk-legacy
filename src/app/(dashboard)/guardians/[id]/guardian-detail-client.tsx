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
  MoreVertical,
  Bell,
  Receipt,
  Car,
  FileText,
} from 'lucide-react'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { formatPhoneNumber } from '@/lib/utils'
import { getGuardianRelationshipLabel } from '@/lib/constants'
import { getGuardianDisplayLabel, getGuardianSecondaryLabel } from '@/lib/guardian-display'
import { useToast } from '@/hooks/use-toast'
import {
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
  togglePrimaryGuardian,
  updateStudentGuardianFlag,
} from '@/app/actions/guardians'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@ui/dropdown-menu'
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
  name: string | null
  phone: string | null
  email: string | null
  relationship: string | null
  occupation: string | null
  address: string | null
  student_guardians: Array<{
    is_primary: boolean
    is_primary_contact: boolean
    receives_notifications: boolean
    receives_billing: boolean
    can_pickup: boolean
    can_view_reports: boolean
    students: {
      id: string
      student_code: string
      grade: string | null
      name: string
    } | null
  }>
}

type StudentGuardianFlag =
  | 'receives_notifications'
  | 'receives_billing'
  | 'can_pickup'
  | 'can_view_reports'

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

  async function handleToggleFlag(
    studentId: string,
    field: StudentGuardianFlag,
    value: boolean,
    labelOnEnable: string,
    labelOnDisable: string
  ) {
    const result = await updateStudentGuardianFlag(guardian.id, studentId, field, value)
    if (!result.success) {
      toast({
        title: '설정 변경 실패',
        description: result.error || '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      })
      return
    }
    toast({
      title: value ? labelOnEnable : labelOnDisable,
    })
    router.refresh()
  }

  const linkedStudentNames = guardian.student_guardians
    .map((sg) => sg.students?.name || '')
    .filter(Boolean)
  const headerLabel = getGuardianDisplayLabel(guardian.name, linkedStudentNames)
  const headerSecondary = getGuardianSecondaryLabel(guardian.name, linkedStudentNames)
  const subtitleParts = [
    guardian.relationship ? `${getGuardianRelationshipLabel(guardian.relationship)} · 보호자` : '보호자',
    headerSecondary ? `본명: ${headerSecondary}` : null,
  ].filter(Boolean) as string[]

  return (
    <PageErrorBoundary pageName="보호자 상세">
      <PageWrapper
        title={headerLabel}
        subtitle={subtitleParts.join(' · ')}
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
                  {guardian.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatPhoneNumber(guardian.phone)}</span>
                    </div>
                  )}
                  {guardian.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.email}</span>
                    </div>
                  )}
                  {!guardian.phone && !guardian.email && (
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
                  {guardian.student_guardians.map((sg, idx) => {
                    const studentId = sg.students?.id
                    const studentName = sg.students?.name || '이름 없음'
                    const permissionBadges: Array<{
                      key: StudentGuardianFlag
                      label: string
                      icon: typeof Bell
                      active: boolean
                    }> = [
                      { key: 'receives_notifications', label: '알림', icon: Bell, active: sg.receives_notifications },
                      { key: 'can_view_reports', label: '리포트', icon: FileText, active: sg.can_view_reports },
                      { key: 'can_pickup', label: '픽업', icon: Car, active: sg.can_pickup },
                      { key: 'receives_billing', label: '결제', icon: Receipt, active: sg.receives_billing },
                    ]
                    const activeBadges = permissionBadges.filter((b) => b.active)

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <UsersIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium">{studentName}</div>
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
                            {activeBadges.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {activeBadges.map((b) => {
                                  const Icon = b.icon
                                  return (
                                    <Badge
                                      key={b.key}
                                      variant="secondary"
                                      className="text-xs font-normal gap-1"
                                    >
                                      <Icon className="h-3 w-3" />
                                      {b.label}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => studentId && router.push(`/students/${studentId}`)}
                          >
                            학생 상세
                          </Button>
                          <RoleGuard allowedRoles={['owner', 'instructor']}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="설정"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>학생별 설정</DropdownMenuLabel>
                                <DropdownMenuCheckboxItem
                                  checked={sg.is_primary}
                                  disabled={isTogglingPrimary || !studentId}
                                  onCheckedChange={() =>
                                    studentId && handleTogglePrimary(studentId, sg.is_primary)
                                  }
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  주 보호자
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                {permissionBadges.map((b) => {
                                  const Icon = b.icon
                                  const enableLabels: Record<StudentGuardianFlag, [string, string]> = {
                                    receives_notifications: ['알림 수신 활성화', '알림 수신 해제'],
                                    can_view_reports: ['리포트 보기 활성화', '리포트 보기 해제'],
                                    can_pickup: ['픽업 가능으로 설정', '픽업 불가로 설정'],
                                    receives_billing: ['결제 알림 활성화', '결제 알림 해제'],
                                  }
                                  return (
                                    <DropdownMenuCheckboxItem
                                      key={b.key}
                                      checked={b.active}
                                      disabled={!studentId}
                                      onCheckedChange={(checked) =>
                                        studentId &&
                                        handleToggleFlag(
                                          studentId,
                                          b.key,
                                          Boolean(checked),
                                          enableLabels[b.key][0],
                                          enableLabels[b.key][1]
                                        )
                                      }
                                    >
                                      <Icon className="h-4 w-4 mr-2" />
                                      {b.label === '알림' ? '알림 수신' : b.label === '리포트' ? '리포트 보기' : b.label === '픽업' ? '픽업 가능' : '결제 알림'}
                                    </DropdownMenuCheckboxItem>
                                  )
                                })}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (studentId) {
                                      setStudentToUnlink({ id: studentId, name: studentName })
                                      setUnlinkDialogOpen(true)
                                    }
                                  }}
                                >
                                  <Unlink className="h-4 w-4 mr-2" />
                                  연결 해제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </RoleGuard>
                        </div>
                      </div>
                    )
                  })}
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
