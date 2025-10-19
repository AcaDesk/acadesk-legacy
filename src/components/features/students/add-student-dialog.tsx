'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
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
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { GRADES, generateStudentCode } from '@/lib/constants'
import { Check, ChevronsUpDown, Users, UserPlus, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GuardianForm } from '@/components/features/guardians/guardian-form'
import type { GuardianRelation } from '@/types/guardian'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ProfileImageUpload } from '@/components/ui/profile-image-upload'
import { hashKioskPin } from '@/app/actions/kiosk'

const guardianSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  relation: z.enum(['father', 'mother', 'grandfather', 'grandmother', 'uncle', 'aunt', 'other'], {
    message: '관계를 선택해주세요',
  }),
  address: z.string().optional(),
  occupation: z.string().optional(),
})

const studentSchema = z.object({
  // 기본 정보
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  birthDate: z.date({
    message: '생년월일을 선택해주세요',
  }),
  gender: z.enum(['male', 'female', 'other']).optional(),
  studentPhone: z.string().optional(),
  profileImage: z.string().optional(),

  // 연락 정보
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),

  // 학습 정보
  grade: z.string().min(1, '학년을 선택해주세요'),
  school: z.string().min(1, '학교를 입력해주세요'),
  enrollmentDate: z.date().optional(),

  // 행정 정보
  notes: z.string().optional(),
  commuteMethod: z.string().optional(),
  marketingSource: z.string().optional(),

  // 키오스크 정보
  kioskPin: z.string()
    .regex(/^\d{4}$/, '4자리 숫자를 입력해주세요')
    .optional()
    .or(z.literal('')),

  // Guardian info
  guardianMode: z.enum(['new', 'existing']),
  guardian: guardianSchema.optional(),
  existingGuardianId: z.string().optional(),
  guardianRelation: z.enum(['father', 'mother', 'grandfather', 'grandmother', 'uncle', 'aunt', 'other']).optional(),
})

type StudentFormValues = z.infer<typeof studentSchema>

interface Guardian {
  id: string
  name: string
  phone: string
  student_guardians?: Array<{
    relation: string
    students: {
      users: {
        name: string
      } | null
    } | null
  }>
}

interface AddStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddStudentDialog({ open, onOpenChange, onSuccess }: AddStudentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<string[]>([])
  const [schoolOpen, setSchoolOpen] = useState(false)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [guardianSearchOpen, setGuardianSearchOpen] = useState(false)
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: '',
      birthDate: new Date(),
      gender: undefined,
      studentPhone: '',
      profileImage: '',
      email: '',
      grade: '',
      school: '',
      enrollmentDate: new Date(),
      notes: '',
      commuteMethod: '',
      marketingSource: '',
      kioskPin: '',
      guardianMode: 'new',
      guardian: {
        name: '',
        phone: '',
        email: '',
        relation: 'mother',
        address: '',
        occupation: '',
      },
      existingGuardianId: '',
      guardianRelation: 'mother',
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form

  const selectedGrade = watch('grade') || ''
  const selectedSchool = watch('school') || ''
  const birthDate = watch('birthDate')
  const enrollmentDate = watch('enrollmentDate')
  const studentPhoneValue = watch('studentPhone')
  const guardianMode = watch('guardianMode')
  const existingGuardianId = watch('existingGuardianId')

  // Scroll to first error when validation fails
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0]
      const element = document.querySelector(`[name="${firstErrorField}"], [id="${firstErrorField}"]`)

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add a small delay before focusing to ensure scroll completes
        setTimeout(() => {
          if (element instanceof HTMLElement) {
            element.focus()
          }
        }, 300)
      }
    }
  }, [errors])

  // Helper function to get relation text
  const getRelationText = (relation: string): string => {
    const relationMap: Record<string, string> = {
      father: '아버지',
      mother: '어머니',
      grandfather: '할아버지',
      grandmother: '할머니',
      uncle: '삼촌',
      aunt: '이모',
      other: '보호자',
    }
    return relationMap[relation] || relation
  }

  // Helper function to get guardian display name with student context
  const getGuardianDisplayName = (guardian: Guardian) => {
    const guardianName = guardian.name || '이름 없음'

    // Get first student relationship for display
    if (guardian.student_guardians && guardian.student_guardians.length > 0) {
      const firstRelation = guardian.student_guardians[0]
      const studentName = firstRelation.students?.users?.name
      const relation = firstRelation.relation

      if (studentName && relation) {
        const relationText = getRelationText(relation)
        return `${guardianName} (${studentName} ${relationText})`
      }
    }

    return guardianName
  }

  // Helper function to get all searchable text for a guardian
  const getSearchableText = (guardian: Guardian) => {
    const texts: string[] = []

    // Guardian name
    if (guardian.name) {
      texts.push(guardian.name)
    }

    // Contact info
    if (guardian.phone) {
      texts.push(guardian.phone)
    }

    // Student-based aliases: "{학생이름} 어머니", "{학생이름} 아버지" etc.
    if (guardian.student_guardians) {
      guardian.student_guardians.forEach((sg) => {
        const studentName = sg.students?.users?.name
        const relation = sg.relation

        if (studentName && relation) {
          const relationText = getRelationText(relation)
          texts.push(`${studentName} ${relationText}`)
          texts.push(`${studentName}${relationText}`)  // Without space
        }
      })
    }

    return texts.join(' ').toLowerCase()
  }

  // Filter guardians based on search term
  const filteredGuardians = guardianSearchTerm
    ? guardians.filter((guardian) => {
        const searchableText = getSearchableText(guardian)
        const search = guardianSearchTerm.toLowerCase()
        return searchableText.includes(search)
      })
    : guardians

  // Load schools and guardians for autocomplete
  useEffect(() => {
    if (open) {
      loadSchools()
      loadGuardians()
    }
  }, [open])

  // Auto-format phone numbers
  useEffect(() => {
    if (studentPhoneValue) {
      const formatted = formatPhoneNumber(studentPhoneValue)
      if (formatted !== studentPhoneValue) {
        setValue('studentPhone', formatted)
      }
    }
  }, [studentPhoneValue, setValue])

  async function loadSchools() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('school')
        .is('deleted_at', null)
        .not('school', 'is', null)

      if (error) throw error

      // Get unique school names
      const uniqueSchools = Array.from(new Set(data.map(s => s.school).filter(Boolean))) as string[]
      setSchools(uniqueSchools.sort())
    } catch (error) {
      console.error('Error loading schools:', error)
    }
  }

  async function loadGuardians() {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from('guardians')
        .select(`
          id,
          name,
          phone,
          student_guardians (
            relation,
            students (
              name
            )
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)

      if (error) throw error

      // Transform data to match Guardian interface
      interface GuardianData {
        id: string
        name: string
        phone?: string | null
        student_guardians?: Array<{
          relation: string
          students: { name: string } | null
        }>
      }

      const transformedGuardians: Guardian[] = (data || []).map((g) => {
        const guardianData = g as unknown as GuardianData

        return {
          id: guardianData.id,
          name: guardianData.name,
          phone: guardianData.phone || '',
          student_guardians: guardianData.student_guardians?.map(sg => ({
            relation: sg.relation,
            students: sg.students ? { users: { name: sg.students.name } } : null
          })) || [],
        }
      })

      setGuardians(transformedGuardians)
    } catch (error) {
      console.error('Error loading guardians:', error)
      // Fallback to mock data on error
      const mockGuardians: Guardian[] = [
        {
          id: '1',
          name: '김영희',
          phone: '010-1111-2222',
          student_guardians: [
            {
              relation: 'mother',
              students: {
                users: { name: '김철수' }
              }
            }
          ]
        },
        {
          id: '2',
          name: '박철수',
          phone: '010-3333-4444',
          student_guardians: [
            {
              relation: 'father',
              students: {
                users: { name: '박민지' }
              }
            }
          ]
        },
        {
          id: '3',
          name: '이순자',
          phone: '010-5555-6666',
          student_guardians: [
            {
              relation: 'grandmother',
              students: {
                users: { name: '이영희' }
              }
            }
          ]
        },
      ]
      setGuardians(mockGuardians)
    }
  }

  function formatPhoneNumber(value: string): string {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '')

    // Format based on length
    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }

    // Limit to 11 digits
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  async function submitStudent(data: StudentFormValues, continueAdding: boolean) {
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
      // For now, we'll do it step by step

      // 1. Create student user record
      const { data: newUser, error: publicUserError } = await supabase
        .from('users')
        .insert({
          tenant_id: currentUser.tenantId,
          email: data.email || null,
          name: data.name,
          role_code: 'student',
        })
        .select()
        .maybeSingle()

      if (publicUserError) {
        console.error('public.users 생성 실패:', publicUserError)
        throw new Error(`사용자 레코드를 생성할 수 없습니다: ${publicUserError.message}`)
      }

      if (!newUser) {
        throw new Error('사용자 레코드 생성 실패')
      }

      const userId = newUser.id

      // 2. Create student record with extended fields
      const studentCode = generateStudentCode()

      // Hash PIN if provided
      let hashedPin: string | null = null
      if (data.kioskPin && data.kioskPin.trim().length === 4) {
        hashedPin = await hashKioskPin(data.kioskPin)
      }

      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert({
          tenant_id: currentUser.tenantId,
          user_id: userId,
          student_code: studentCode,
          name: data.name,
          birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
          gender: data.gender || null,
          student_phone: data.studentPhone || null,
          profile_image_url: data.profileImage || null,
          grade: data.grade,
          school: data.school || null,
          enrollment_date: data.enrollmentDate ? format(data.enrollmentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          notes: data.notes || null,
          commute_method: data.commuteMethod || null,
          marketing_source: data.marketingSource || null,
          kiosk_pin: hashedPin,
        })
        .select()
        .single()

      if (studentError) throw studentError

      // 3. Handle guardian creation or linking
      if (data.guardianMode === 'new' && data.guardian) {
        // Create new guardian directly
        const { data: newGuardian, error: guardianError } = await supabase
          .from('guardians')
          .insert({
            tenant_id: currentUser.tenantId,
            name: data.guardian.name,
            phone: data.guardian.phone || null,
            email: data.guardian.email || null,
            relationship: data.guardian.relation || null,
            occupation: data.guardian.occupation || null,
            address: data.guardian.address || null,
          })
          .select()
          .single()

        if (guardianError) throw guardianError

        // Link guardian to student
        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert({
            tenant_id: currentUser.tenantId,
            guardian_id: newGuardian.id,
            student_id: newStudent.id,
            relation: data.guardian.relation || null,
            is_primary_contact: true,
            receives_notifications: true,
            receives_billing: false,
            can_pickup: true,
          })

        if (linkError) throw linkError

        toast({
          title: '학생 및 학부모 추가 완료',
          description: `${data.name} 학생과 ${data.guardian.name} 학부모가 추가되었습니다.`,
        })
      } else if (data.guardianMode === 'existing' && data.existingGuardianId && data.guardianRelation) {
        // Link existing guardian to student
        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert({
            tenant_id: currentUser.tenantId,
            guardian_id: data.existingGuardianId,
            student_id: newStudent.id,
            relation: data.guardianRelation || null,
            is_primary_contact: true,
            receives_notifications: true,
            receives_billing: false,
            can_pickup: true,
          })

        if (linkError) throw linkError

        toast({
          title: '학생 추가 및 학부모 연결 완료',
          description: `${data.name} 학생이 추가되고 기존 학부모와 연결되었습니다.`,
        })
      } else {
        toast({
          title: '학생 추가 완료',
          description: `${data.name} 학생이 추가되었습니다. (학생 코드: ${studentCode})`,
        })
      }

      // Reload schools list if new school was added
      if (data.school && !schools.includes(data.school)) {
        loadSchools()
      }

      // Reset form for continuous adding or close dialog
      if (continueAdding) {
        reset()
      } else {
        reset()
        onOpenChange(false)
      }

      // Notify parent to refresh data
      onSuccess?.()
    } catch (error: unknown) {
      console.error('학생 추가 오류:', error)
      toast({
        title: '학생 추가 실패',
        description: error instanceof Error ? error.message : '학생을 추가하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: StudentFormValues) => submitStudent(data, false)
  const onSubmitAndContinue = () => {
    handleSubmit((data) => submitStudent(data, true))()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
          <DialogDescription>
            새로운 학생 정보를 입력하세요. 필수 항목은 * 표시되어 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* 👤 학생 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">👤 학생 기본 정보</h3>
            <p className="text-sm text-muted-foreground">학생 식별과 기본적인 관리를 위한 필수 정보입니다.</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">생년월일 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !birthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {birthDate ? format(birthDate, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={birthDate}
                      onSelect={(date) => date && setValue('birthDate', date)}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
                {errors.birthDate && (
                  <p className="text-sm text-destructive">{errors.birthDate.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">성별</Label>
                <Select onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')} value={watch('gender') || ''}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남성</SelectItem>
                    <SelectItem value="female">여성</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentPhone">학생 연락처</Label>
                <Input
                  id="studentPhone"
                  placeholder="010-0000-0000"
                  {...register('studentPhone')}
                />
                <p className="text-xs text-muted-foreground">고학년 학생의 직접 소통용</p>
              </div>
            </div>

            {/* Profile Image Upload */}
            <ProfileImageUpload
              studentId={undefined}
              studentName={watch('name') || 'Student'}
              gender={watch('gender')}
              onImageUploaded={(url) => setValue('profileImage', url)}
            />
          </div>

          {/* 📚 학습 관련 정보 */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">📚 학습 관련 정보</h3>
            <p className="text-sm text-muted-foreground">학생의 학습 지도와 반 배정을 위한 정보입니다.</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grade">학년 *</Label>
                <Select onValueChange={(value) => setValue('grade', value)} value={selectedGrade}>
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade && (
                  <p className="text-sm text-destructive">{errors.grade.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">재학중인 학교 *</Label>
                <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={schoolOpen}
                      className="w-full justify-between"
                    >
                      {selectedSchool || "학교 선택..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="학교 검색 또는 입력..."
                        onValueChange={(value) => {
                          setValue('school', value)
                        }}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="p-2">
                            <p className="text-sm text-muted-foreground mb-2">검색 결과가 없습니다.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                setSchoolOpen(false)
                              }}
                            >
                              &quot;{selectedSchool}&quot; 입력하기
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {schools.map((school) => (
                            <CommandItem
                              key={school}
                              value={school}
                              onSelect={(currentValue) => {
                                setValue('school', currentValue)
                                setSchoolOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedSchool === school ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {school}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.school && (
                  <p className="text-sm text-destructive">{errors.school.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentDate">입회일 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !enrollmentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {enrollmentDate ? format(enrollmentDate, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={enrollmentDate}
                    onSelect={(date) => date && setValue('enrollmentDate', date)}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">수강 기간 산정 및 첫 달 학원비 일할 계산 기준</p>
            </div>
          </div>

          {/* 📝 기타 행정 정보 */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">📝 기타 행정 정보</h3>
            <p className="text-sm text-muted-foreground">학원의 원활한 운영과 학생의 안전을 위한 추가 정보입니다.</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="commuteMethod">등원 방법</Label>
                <Select onValueChange={(value) => setValue('commuteMethod', value)} value={watch('commuteMethod') || ''}>
                  <SelectTrigger id="commuteMethod">
                    <SelectValue placeholder="등원 방법 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shuttle">셔틀버스</SelectItem>
                    <SelectItem value="walk">도보</SelectItem>
                    <SelectItem value="private">자가</SelectItem>
                    <SelectItem value="public">대중교통</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">안전한 등하원 관리를 위한 정보</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketingSource">마케팅 경로</Label>
                <Select onValueChange={(value) => setValue('marketingSource', value)} value={watch('marketingSource') || ''}>
                  <SelectTrigger id="marketingSource">
                    <SelectValue placeholder="마케팅 경로 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">지인 소개</SelectItem>
                    <SelectItem value="blog">블로그</SelectItem>
                    <SelectItem value="sign">간판</SelectItem>
                    <SelectItem value="online_ad">온라인 광고</SelectItem>
                    <SelectItem value="social_media">SNS</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">마케팅 효율 분석용</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">특이사항 / 메모 (권장)</Label>
              <Textarea
                id="notes"
                placeholder="건강 문제(알러지), 성격, 학습 습관 등 강사가 반드시 알아야 할 내용을 기록해주세요..."
                rows={4}
                className="resize-none"
                {...register('notes')}
              />
              <p className="text-xs text-muted-foreground">매우 중요한 항목입니다. 학생 지도에 필요한 모든 정보를 자세히 기록해주세요.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kioskPin">키오스크 PIN (4자리)</Label>
              <Input
                id="kioskPin"
                type="password"
                placeholder="••••"
                maxLength={4}
                autoComplete="new-password"
                {...register('kioskPin')}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setValue('kioskPin', value)
                }}
              />
              {errors.kioskPin && (
                <p className="text-sm text-destructive">{errors.kioskPin.message}</p>
              )}
              <p className="text-xs text-muted-foreground">학생이 키오스크 모드에서 TODO를 확인하기 위한 4자리 PIN입니다. 미입력 시 키오스크 접근 불가능합니다.</p>
            </div>
          </div>

          {/* 학부모 정보 */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-semibold">학부모 정보</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              신규 학부모를 등록하거나 기존 학부모(형제 자매용)를 연결할 수 있습니다.
            </p>

            <Tabs value={guardianMode} onValueChange={(v) => setValue('guardianMode', v as 'new' | 'existing')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">
                  <UserPlus className="h-4 w-4 mr-2" />
                  신규 학부모 등록
                </TabsTrigger>
                <TabsTrigger value="existing">
                  <Users className="h-4 w-4 mr-2" />
                  기존 학부모 연결
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="space-y-4 mt-4">
                <GuardianForm form={form} prefix="guardian." />
              </TabsContent>

              <TabsContent value="existing" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="existingGuardian">학부모 선택 *</Label>
                    <Popover open={guardianSearchOpen} onOpenChange={setGuardianSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={guardianSearchOpen}
                          className="w-full justify-between"
                        >
                          {existingGuardianId
                            ? (() => {
                                const selectedGuardian = guardians.find((g) => g.id === existingGuardianId)
                                return selectedGuardian ? getGuardianDisplayName(selectedGuardian) : "보호자 검색..."
                              })()
                            : "보호자 검색..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder='보호자 이름, "철수 어머니", 연락처로 검색...'
                            value={guardianSearchTerm}
                            onValueChange={setGuardianSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>등록된 보호자가 없습니다.</CommandEmpty>
                            <CommandGroup>
                              {filteredGuardians.map((guardian) => {
                                const displayName = getGuardianDisplayName(guardian)
                                const studentContext = guardian.student_guardians && guardian.student_guardians.length > 0
                                  ? guardian.student_guardians.map((sg, idx) => {
                                      const studentName = sg.students?.users?.name
                                      const relation = sg.relation
                                      if (studentName && relation) {
                                        return `${studentName} ${getRelationText(relation)}`
                                      }
                                      return null
                                    }).filter(Boolean).join(', ')
                                  : null

                                return (
                                  <CommandItem
                                    key={guardian.id}
                                    value={getSearchableText(guardian)}
                                    onSelect={() => {
                                      setValue('existingGuardianId', guardian.id)
                                      setGuardianSearchOpen(false)
                                      setGuardianSearchTerm('')
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4 flex-shrink-0",
                                        existingGuardianId === guardian.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">{guardian.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {guardian.phone}
                                        {studentContext && (
                                          <span className="ml-2">• {studentContext}</span>
                                        )}
                                      </div>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guardianRelation">관계 *</Label>
                    <Select
                      value={watch('guardianRelation')}
                      onValueChange={(value) => setValue('guardianRelation', value as GuardianRelation)}
                    >
                      <SelectTrigger id="guardianRelation">
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
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 버튼 */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onSubmitAndContinue}
              disabled={loading}
            >
              {loading ? '저장 중...' : '저장 후 계속 추가'}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : '저장 후 닫기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
