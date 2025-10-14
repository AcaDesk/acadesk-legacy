'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Users, UserPlus, Check, ChevronsUpDown, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GuardianFormStandalone, guardianFormSchema, type GuardianFormValues } from '@/components/features/guardians/guardian-form'
import type { GuardianRelation, GuardianWithUser } from '@/types/guardian'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

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
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

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
  }, [open, studentId])

  async function loadLinkedGuardians() {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('guardian_students')
        .select(`
          relationship,
          is_primary,
          guardians!inner(
            id,
            user_id,
            users!inner(name, phone, email)
          )
        `)
        .eq('student_id', studentId)
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)

      if (error) throw error

      // Transform data to match GuardianWithUser type
      interface GuardianStudentJoin {
        relationship: string
        is_primary: boolean
        guardians: {
          id: string
          user_id: string
          users: {
            name: string
            phone: string
            email?: string | null
          }
        }
      }

      const guardians: GuardianWithUser[] = (data || []).map((item) => {
        const typedItem = item as unknown as GuardianStudentJoin
        return {
          id: typedItem.guardians.id,
          user_id: typedItem.guardians.user_id,
          name: typedItem.guardians.users.name,
          phone: typedItem.guardians.users.phone,
          email: typedItem.guardians.users.email ?? null,
          address: null,
          occupation: null,
          relation: typedItem.relationship as GuardianRelation,
          is_primary: typedItem.is_primary,
        }
      })

      setLinkedGuardians(guardians)
    } catch (error) {
      console.error('Error loading linked guardians:', error)
      toast({
        title: '데이터 로드 오류',
        description: '학부모 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function loadAvailableGuardians() {
    if (!currentUser) return

    try {
      // Get all guardians in the tenant
      const { data: allGuardians, error: allError } = await supabase
        .from('guardians')
        .select(`
          id,
          users!inner(name, phone)
        `)
        .eq('tenant_id', currentUser.tenantId)

      if (allError) throw allError

      // Get already linked guardian IDs
      const { data: linkedIds, error: linkedError } = await supabase
        .from('guardian_students')
        .select('guardian_id')
        .eq('student_id', studentId)
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)

      if (linkedError) throw linkedError

      const linkedGuardianIds = new Set((linkedIds || []).map(item => item.guardian_id))

      // Filter out already linked guardians
      const available = (allGuardians || [])
        .filter(g => !linkedGuardianIds.has(g.id))
        .map(g => {
          const usersArray = g.users as unknown as Array<{ name: string; phone: string }>
          const user = Array.isArray(usersArray) && usersArray.length > 0 ? usersArray[0] : { name: '', phone: '' }
          return {
            id: g.id,
            name: user.name,
            phone: user.phone,
          }
        })

      setAvailableGuardians(available)
    } catch (error) {
      console.error('Error loading available guardians:', error)
      toast({
        title: '데이터 로드 오류',
        description: '사용 가능한 학부모 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleAddGuardian(data: GuardianFormValues) {
    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // TODO: Replace with RPC function for atomic transaction
      // 1. Create guardian user
      const { data: guardianUser, error: guardianUserError } = await supabase
        .from('users')
        .insert({
          tenant_id: currentUser.tenantId,
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          role_code: 'guardian',
        })
        .select()
        .single()

      if (guardianUserError) throw guardianUserError

      // 2. Create guardian record
      const { data: newGuardian, error: guardianError } = await supabase
        .from('guardians')
        .insert({
          tenant_id: currentUser.tenantId,
          user_id: guardianUser.id,
        })
        .select()
        .single()

      if (guardianError) throw guardianError

      // 3. Link to student
      const { error: linkError } = await supabase
        .from('guardian_students')
        .insert({
          tenant_id: currentUser.tenantId,
          guardian_id: newGuardian.id,
          student_id: studentId,
          relationship: data.relationship,
          is_primary: linkedGuardians.length === 0, // First guardian is primary
        })

      if (linkError) throw linkError

      toast({
        title: '학부모 추가 완료',
        description: `${data.name} 학부모가 추가되고 ${studentName} 학생과 연결되었습니다.`,
      })

      loadLinkedGuardians()
      loadAvailableGuardians()
      onSuccess?.()
    } catch (error: unknown) {
      console.error('학부모 추가 오류:', error)
      toast({
        title: '학부모 추가 실패',
        description: error instanceof Error ? error.message : '학부모를 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleLinkGuardian(data: LinkGuardianFormValues) {
    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const { error: linkError } = await supabase
        .from('guardian_students')
        .insert({
          tenant_id: currentUser.tenantId,
          guardian_id: data.guardianId,
          student_id: studentId,
          relationship: data.relationship,
          is_primary: linkedGuardians.length === 0,
        })

      if (linkError) throw linkError

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
      console.error('학부모 연결 오류:', error)
      toast({
        title: '학부모 연결 실패',
        description: error instanceof Error ? error.message : '학부모를 연결하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleUnlinkGuardian(guardianId: string, guardianName: string) {
    if (!currentUser) return

    if (!confirm(`${guardianName} 학부모와의 연결을 해제하시겠습니까?`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('guardian_students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('tenant_id', currentUser.tenantId)
        .eq('guardian_id', guardianId)
        .eq('student_id', studentId)

      if (error) throw error

      toast({
        title: '연결 해제 완료',
        description: `${guardianName} 학부모와의 연결이 해제되었습니다.`,
      })

      loadLinkedGuardians()
      loadAvailableGuardians()
      onSuccess?.()
    } catch (error: unknown) {
      console.error('연결 해제 오류:', error)
      toast({
        title: '연결 해제 실패',
        description: error instanceof Error ? error.message : '연결을 해제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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
                              {guardian.is_primary && (
                                <Badge variant="default" className="text-xs">주</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRelationText(guardian.relation!)}</TableCell>
                          <TableCell>{guardian.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {guardian.email || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkGuardian(guardian.id, guardian.name)}
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
                                      <div className="text-xs text-muted-foreground">{guardian.phone}</div>
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
    </Dialog>
  )
}
