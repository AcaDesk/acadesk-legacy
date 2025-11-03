'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { getErrorMessage } from '@/lib/error-handlers'
import { formatPhoneNumber } from '@/lib/utils'
import {
  getStudentGuardians,
  getAvailableGuardians,
  linkGuardianToStudent,
  unlinkGuardianFromStudent,
  createGuardian,
} from '@/app/actions/guardians'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Users, UserPlus, Check, ChevronsUpDown, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { GuardianFormStandalone, type GuardianFormValues } from '@/components/features/guardians/guardian-form'
import type { GuardianRelation, GuardianWithUser } from '@/core/types/guardian'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

const linkGuardianSchema = z.object({
  guardianId: z.string().min(1, '학부모를 선택해주세요'),
  relationship: z.string().min(1, '관계를 선택해주세요'),
})

type LinkGuardianFormValues = z.infer<typeof linkGuardianSchema>

interface ManageGuardiansDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  onSuccess?: () => void
}

export function ManageGuardiansDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSuccess,
}: ManageGuardiansDialogProps) {
  const [loading, setLoading] = useState(false)
  const [linkedGuardians, setLinkedGuardians] = useState<GuardianWithUser[]>([])
  const [availableGuardians, setAvailableGuardians] = useState<Array<{ id: string; name: string; phone: string }>>([])
  const [guardianSearchOpen, setGuardianSearchOpen] = useState(false)
  const [actionMode, setActionMode] = useState<'add' | 'link'>('add')
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  // Unlink confirmation dialog state
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [guardianToUnlink, setGuardianToUnlink] = useState<{ id: string; name: string } | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const linkForm = useForm<LinkGuardianFormValues>({
    resolver: zodResolver(linkGuardianSchema),
    defaultValues: {
      guardianId: '',
      relationship: '',
    },
  })

  useEffect(() => {
    if (open) {
      loadLinkedGuardians()
      loadAvailableGuardians()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId])

  async function loadLinkedGuardians() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      // Server Action을 통한 학생의 보호자 목록 조회
      const result = await getStudentGuardians(studentId)

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록 조회 실패')
      }

      // Transform to GuardianWithUser format
      const guardiansWithUser: GuardianWithUser[] = result.data.map((sg: any) => ({
        id: sg.guardians?.id || '',
        user_id: sg.guardians?.user_id || '',
        name: sg.guardians?.users?.name || '',
        phone: sg.guardians?.users?.phone || '',
        email: sg.guardians?.users?.email || null,
        relationship: sg.guardians?.relationship || '',
        address: sg.guardians?.users?.address || null,
        occupation: sg.guardians?.users?.occupation || null,
        relation: sg.relation,
        is_primary_contact: sg.is_primary || false,
        receives_notifications: true,
        receives_billing: true,
        can_pickup: true,
      }))

      setLinkedGuardians(guardiansWithUser)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function loadAvailableGuardians() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      // Server Action을 통한 사용 가능한 보호자 목록 조회
      const result = await getAvailableGuardians(studentId)

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록 조회 실패')
      }

      // Transform to simple format for dropdown
      const available = result.data.map((g: any) => ({
        id: g.id,
        name: g.users?.name || '',
        phone: g.users?.phone || '',
      }))

      setAvailableGuardians(available)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleAddGuardian(data: GuardianFormValues) {
    if (!currentUser || !currentUser.tenantId) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Server Action을 통한 보호자 생성 및 연결
      const result = await createGuardian({
        name: data.name,
        phone: data.phone || '',
        email: data.email || null,
        relationship: data.relationship || '',
        occupation: data.occupation || null,
        address: data.address || null,
        student_ids: [studentId], // 자동으로 학생과 연결
      })

      if (!result.success) {
        throw new Error(result.error || '보호자 추가 실패')
      }

      toast({
        title: '학부모 추가 완료',
        description: `${data.name} 학부모가 추가되고 ${studentName} 학생과 연결되었습니다.`,
      })

      loadLinkedGuardians()
      loadAvailableGuardians()
      onSuccess?.()
    } catch (error: unknown) {
      toast({
        title: '학부모 추가 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleLinkGuardian(data: LinkGuardianFormValues) {
    if (!currentUser || !currentUser.tenantId) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Server Action을 통한 보호자 연결
      const result = await linkGuardianToStudent(
        studentId,
        data.guardianId,
        data.relationship
      )

      if (!result.success) {
        throw new Error(result.error || '보호자 연결 실패')
      }

      const guardianName = availableGuardians.find(g => g.id === data.guardianId)?.name

      toast({
        title: '학부모 연결 완료',
        description: `${guardianName} 학부모가 ${studentName} 학생과 연결되었습니다.`,
      })

      linkForm.reset()
      loadLinkedGuardians()
      loadAvailableGuardians()
      onSuccess?.()
    } catch (error: unknown) {
      toast({
        title: '학부모 연결 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleUnlinkClick(guardianId: string, guardianName: string) {
    setGuardianToUnlink({ id: guardianId, name: guardianName })
    setUnlinkDialogOpen(true)
  }

  async function handleConfirmUnlink() {
    if (!currentUser || !currentUser.tenantId || !guardianToUnlink) return

    setIsUnlinking(true)
    try {
      // Server Action을 통한 보호자 연결 해제
      const result = await unlinkGuardianFromStudent(studentId, guardianToUnlink.id)

      if (!result.success) {
        throw new Error(result.error || '연결 해제 실패')
      }

      toast({
        title: '연결 해제 완료',
        description: `${guardianToUnlink.name} 학부모와의 연결이 해제되었습니다.`,
      })

      loadLinkedGuardians()
      loadAvailableGuardians()
      onSuccess?.()
    } catch (error: unknown) {
      toast({
        title: '연결 해제 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsUnlinking(false)
      setUnlinkDialogOpen(false)
      setGuardianToUnlink(null)
    }
  }

  const getRelationText = (relation: GuardianRelation) => {
    const relationMap: Record<GuardianRelation, string> = {
      father: '아버지',
      mother: '어머니',
      grandfather: '할아버지',
      grandmother: '할머니',
      uncle: '삼촌',
      aunt: '이모/고모',
      other: '기타',
    }
    return relationMap[relation] || relation
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DialogTitle>학부모 관리 - {studentName}</DialogTitle>
            <DialogDescription>
              학생의 학부모 정보를 추가, 연결 또는 관리할 수 있습니다
            </DialogDescription>
          </motion.div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Guardians */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              현재 연결된 학부모 ({linkedGuardians.length}명)
            </h3>
            <AnimatePresence mode="wait">
              {linkedGuardians.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="text-center py-8 text-muted-foreground border rounded-lg"
                >
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>연결된 학부모가 없습니다.</p>
                  <p className="text-sm mt-1">아래에서 학부모를 추가하거나 연결하세요.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="border rounded-lg"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>관계</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkedGuardians.map((guardian, index) => (
                        <motion.tr
                          key={guardian.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{guardian.name}</span>
                              {guardian.is_primary_contact && (
                                <Badge variant="default" className="text-xs">주</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRelationText(guardian.relation!)}</TableCell>
                          <TableCell>{formatPhoneNumber(guardian.phone)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {guardian.email || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkClick(guardian.id, guardian.name)}
                              disabled={loading}
                              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              연결 해제
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Add or Link Guardian */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-4 border-t pt-6"
          >
            <h3 className="text-sm font-semibold">학부모 추가/연결</h3>

            <Tabs value={actionMode} onValueChange={(v) => setActionMode(v as 'add' | 'link')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="add">
                  <UserPlus className="h-4 w-4 mr-2" />
                  신규 학부모 추가
                </TabsTrigger>
                <TabsTrigger value="link">
                  <Users className="h-4 w-4 mr-2" />
                  기존 학부모 연결
                </TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="space-y-4 mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="add-form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GuardianFormStandalone
                      onSubmit={handleAddGuardian}
                      submitLabel="학부모 추가"
                      loading={loading}
                    />
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="link" className="space-y-4 mt-4">
                <AnimatePresence mode="wait">
                  <motion.form
                    key="link-form"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={linkForm.handleSubmit(handleLinkGuardian)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="guardianId">학부모 선택 *</Label>
                      <Popover open={guardianSearchOpen} onOpenChange={setGuardianSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={guardianSearchOpen}
                            className="w-full justify-between"
                          >
                            {linkForm.watch('guardianId')
                              ? availableGuardians.find((g) => g.id === linkForm.watch('guardianId'))?.name
                              : "학부모 검색..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="학부모 이름 또는 전화번호 검색..." />
                            <CommandList>
                              <CommandEmpty>사용 가능한 학부모가 없습니다.</CommandEmpty>
                              <CommandGroup>
                                {availableGuardians.map((guardian) => (
                                  <CommandItem
                                    key={guardian.id}
                                    value={`${guardian.name} ${guardian.phone}`}
                                    onSelect={() => {
                                      linkForm.setValue('guardianId', guardian.id)
                                      setGuardianSearchOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        linkForm.watch('guardianId') === guardian.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div>
                                      <div className="font-medium">{guardian.name}</div>
                                      <div className="text-xs text-muted-foreground">{formatPhoneNumber(guardian.phone)}</div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {linkForm.formState.errors.guardianId && (
                        <p className="text-sm text-destructive">
                          {linkForm.formState.errors.guardianId.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="relationship">관계 *</Label>
                      <Select
                        value={linkForm.watch('relationship')}
                        onValueChange={(value) => linkForm.setValue('relationship', value)}
                      >
                        <SelectTrigger id="relationship">
                          <SelectValue placeholder="관계 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="father">아버지</SelectItem>
                          <SelectItem value="mother">어머니</SelectItem>
                          <SelectItem value="grandfather">할아버지</SelectItem>
                          <SelectItem value="grandmother">할머니</SelectItem>
                          <SelectItem value="uncle">삼촌</SelectItem>
                          <SelectItem value="aunt">이모/고모</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                      {linkForm.formState.errors.relationship && (
                        <p className="text-sm text-destructive">
                          {linkForm.formState.errors.relationship.message}
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            연결 중...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 mr-2" />
                            학부모 연결
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </motion.form>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </DialogContent>

      {/* Unlink Confirmation Dialog */}
      <ConfirmationDialog
        open={unlinkDialogOpen}
        onOpenChange={setUnlinkDialogOpen}
        title="학부모 연결 해제"
        description={guardianToUnlink ? `${guardianToUnlink.name} 학부모와 ${studentName} 학생의 연결을 해제하시겠습니까?` : ''}
        confirmText="연결 해제"
        variant="destructive"
        isLoading={isUnlinking}
        onConfirm={handleConfirmUnlink}
      />
    </Dialog>
  )
}
