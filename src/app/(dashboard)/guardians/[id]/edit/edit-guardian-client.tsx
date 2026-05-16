'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Checkbox } from '@ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { GUARDIAN_RELATIONSHIPS } from '@/lib/constants'
import { getGuardianDisplayLabel } from '@/lib/guardian-display'
import { PhoneInput } from '@ui/phone-input'
import { guardianFormSchema, type GuardianFormValues } from '@/components/features/guardians/guardian-form'
import { updateGuardianWithStudents } from '@/app/actions/guardians'
import { getErrorMessage } from '@/lib/error-handlers'

interface StudentOption {
  id: string
  student_code: string
  name: string
}

interface GuardianData {
  id: string
  relationship: string | null
  occupation: string | null
  address: string | null
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  connectedStudentIds: string[]
  linkedStudentNames: string[]
}

interface EditGuardianClientProps {
  guardian: GuardianData
  students: StudentOption[]
}

export function EditGuardianClient({ guardian, students }: EditGuardianClientProps) {
  const [loading, setLoading] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>(guardian.connectedStudentIds)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: {
      name: guardian.userName || '',
      email: guardian.userEmail || '',
      phone: guardian.userPhone || '',
      relationship: guardian.relationship || '',
      occupation: guardian.occupation || '',
      address: guardian.address || '',
    },
  })

  const selectedRelationship = watch('relationship')
  const guardianPhone = watch('phone')

  const onSubmit = async (data: GuardianFormValues) => {
    setLoading(true)
    try {
      const result = await updateGuardianWithStudents({
        guardian_id: guardian.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        relationship: data.relationship,
        occupation: data.occupation || null,
        address: data.address || null,
        student_ids: selectedStudents,
      })

      if (!result.success) {
        throw new Error(result.error || '보호자 정보 수정에 실패했습니다')
      }

      toast({
        title: '보호자 정보 수정 완료',
        description: `${data.name} 보호자의 정보가 수정되었습니다.`,
      })

      router.push(`/guardians/${guardian.id}`)
      router.refresh()
    } catch (error: unknown) {
      console.error('보호자 수정 오류:', error)
      toast({
        title: '보호자 수정 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const displayLabel = getGuardianDisplayLabel(guardian.userName, guardian.linkedStudentNames)

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/guardians" className="hover:text-foreground transition-colors">
              보호자 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/guardians/${guardian.id}`} className="hover:text-foreground transition-colors">
              {displayLabel}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">수정</span>
          </nav>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">보호자 정보 수정</h1>
            <p className="text-muted-foreground">{displayLabel}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>보호자 정보</CardTitle>
            <CardDescription>
              보호자의 기본 정보를 수정해주세요. 필수 항목은 * 표시되어 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">기본 정보</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input id="name" placeholder="홍길동" {...register('name')} />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="relationship">관계 *</Label>
                    <Select
                      onValueChange={(value) => setValue('relationship', value)}
                      value={selectedRelationship}
                    >
                      <SelectTrigger id="relationship">
                        <SelectValue placeholder="관계 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.relationship && (
                      <p className="text-sm text-destructive">{errors.relationship.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="occupation">직업</Label>
                    <Input
                      id="occupation"
                      placeholder="직업"
                      {...register('occupation')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">주소</Label>
                    <Input
                      id="address"
                      placeholder="주소"
                      {...register('address')}
                    />
                  </div>
                </div>
              </div>

              {/* 연락처 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">연락처</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">연락처 *</Label>
                    <PhoneInput
                      id="phone"
                      value={guardianPhone || ''}
                      onChange={(value) => setValue('phone', value, { shouldValidate: true })}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="guardian@example.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 학생 연결 */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">학생 연결</h3>
                <div className="space-y-2">
                  <Label>연결할 학생 선택</Label>
                  <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {students.length > 0 ? (
                      <div className="space-y-3">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                            />
                            <label
                              htmlFor={`student-${student.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {student.name || '이름 없음'} ({student.student_code})
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">등록된 학생이 없습니다.</p>
                    )}
                  </div>
                  {selectedStudents.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedStudents.length}명의 학생이 선택되었습니다.
                    </p>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 justify-end">
                <Button asChild variant="outline">
                  <Link href={`/guardians/${guardian.id}`}>
                    취소
                  </Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
