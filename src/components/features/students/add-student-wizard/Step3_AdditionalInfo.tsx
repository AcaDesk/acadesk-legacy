import { useFormContext } from 'react-hook-form'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { DatePicker } from '@ui/date-picker'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import type { StudentWizardFormValues } from './types'

export function Step3_AdditionalInfo() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<StudentWizardFormValues>()

  const enrollmentDate = watch('enrollmentDate')
  const studentPhone = watch('studentPhone')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="studentPhone">학생 연락처</Label>
          <PhoneInput
            id="studentPhone"
            value={studentPhone || ''}
            onChange={(value) => setValue('studentPhone', value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>입회일</Label>
        <DatePicker
          value={enrollmentDate}
          onChange={(date) => setValue('enrollmentDate', date as Date)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="commuteMethod">등원 방법</Label>
          <Select onValueChange={(value) => setValue('commuteMethod', value)}>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketingSource">마케팅 경로</Label>
          <Select onValueChange={(value) => setValue('marketingSource', value)}>
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
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kioskPin">키오스크 PIN (4자리)</Label>
        <Input
          id="kioskPin"
          type="password"
          placeholder="••••"
          maxLength={4}
          {...register('kioskPin')}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 4)
            setValue('kioskPin', value)
          }}
        />
        {errors.kioskPin && (
          <p className="text-sm text-destructive">{errors.kioskPin.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          학생이 키오스크에서 TODO를 확인하기 위한 PIN입니다.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">특이사항 / 메모</Label>
        <Textarea
          id="notes"
          placeholder="건강 문제, 알러지, 학습 습관 등..."
          rows={4}
          className="resize-none"
          {...register('notes')}
        />
      </div>
    </div>
  )
}
