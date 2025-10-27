import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@ui/input'
import { DatePicker } from '@ui/date-picker'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { GradeSelector } from '@/components/features/common/grade-selector'
import { SchoolSelector } from '@/components/features/common/school-selector'
import type { StudentWizardFormValues } from './types'

interface Step1Props {
  schools: string[]
}

export function Step1_StudentInfo({ schools }: Step1Props) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<StudentWizardFormValues>()

  const selectedGrade = watch('grade')
  const selectedSchool = watch('school')
  const birthDate = watch('birthDate')
  const currentYear = new Date().getFullYear()

  // register에서 ref를 추출하여 포커스 관리
  const nameRegister = register('name')

  // 포커스 관리: 컴포넌트가 마운트될 때 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (nameRegister.ref && 'current' in nameRegister.ref) {
      const inputElement = nameRegister.ref.current as HTMLInputElement | null
      inputElement?.focus()
    }
  }, [nameRegister.ref])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">이름 *</Label>
          <Input
            id="name"
            placeholder="홍길동"
            {...nameRegister}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>생년월일 *</Label>
          <DatePicker
            value={birthDate}
            onChange={(date) => setValue('birthDate', date as Date, { shouldValidate: true })}
            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
            captionLayout="dropdown"
            fromYear={currentYear - 30}
            toYear={currentYear}
          />
          {errors.birthDate && (
            <p className="text-sm text-destructive">{errors.birthDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade">학년 *</Label>
          <GradeSelector
            value={selectedGrade}
            onChange={(value) => setValue('grade', value)}
            placeholder="학년 선택"
          />
          {errors.grade && (
            <p className="text-sm text-destructive">{errors.grade.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">학교 *</Label>
          <SchoolSelector
            value={selectedSchool}
            onChange={(value) => setValue('school', value, { shouldValidate: true })}
            schools={schools}
            placeholder="학교 선택 또는 입력..."
          />
          {errors.school && (
            <p className="text-sm text-destructive">{errors.school.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">성별</Label>
        <Select onValueChange={(value: 'male' | 'female' | 'other') => setValue('gender', value)}>
          <SelectTrigger id="gender">
            <SelectValue placeholder="성별 선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">남성</SelectItem>
            <SelectItem value="female">여성</SelectItem>
            <SelectItem value="other">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
