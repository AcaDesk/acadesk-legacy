'use client'

import { useEffect } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GUARDIAN_RELATIONSHIPS } from '@/lib/constants'

export const guardianFormSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  relationship: z.string().min(1, '관계를 선택해주세요'),
})

export type GuardianFormValues = z.infer<typeof guardianFormSchema>

interface GuardianFormStandaloneProps {
  initialValues?: Partial<GuardianFormValues>
  onSubmit: (data: GuardianFormValues) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  loading?: boolean
}

// Standalone form component (with its own form state)
export function GuardianFormStandalone({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = '저장',
  loading = false,
}: GuardianFormStandaloneProps) {
  const form = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: initialValues || {
      name: '',
      email: '',
      phone: '',
      relationship: '',
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <GuardianFormFields form={form} disabled={loading} />
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            취소
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? '저장 중...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

// Form fields component (for use with external form state)
interface GuardianFormFieldsProps {
  form: UseFormReturn<unknown>
  prefix?: string
  disabled?: boolean
}

export function GuardianFormFields({ form, prefix = '', disabled = false }: GuardianFormFieldsProps) {
  const { register, setValue, watch, formState: { errors } } = form

  const phoneValue = watch(`${prefix}phone`)
  const relationshipValue = watch(`${prefix}relationship`)

  // Auto-format phone number
  useEffect(() => {
    if (phoneValue) {
      const formatted = formatPhoneNumber(phoneValue)
      if (formatted !== phoneValue) {
        setValue(`${prefix}phone`, formatted, { shouldValidate: true })
      }
    }
  }, [phoneValue, setValue, prefix])

  function formatPhoneNumber(value: string): string {
    const numbers = value.replace(/\D/g, '')

    if (numbers.length <= 3) {
      return numbers
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const getError = (field: string) => {
    const keys = `${prefix}${field}`.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: unknown = errors
    for (const key of keys) {
      error = error?.[key]
    }
    return error
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}name`}>이름 *</Label>
          <Input
            id={`${prefix}name`}
            placeholder="홍길동"
            {...register(`${prefix}name`)}
            disabled={disabled}
          />
          {getError('name') && (
            <p className="text-sm text-destructive">{getError('name').message}</p>
          )}
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}relationship`}>관계 *</Label>
          <Select
            value={relationshipValue}
            onValueChange={(value) => setValue(`${prefix}relationship`, value)}
            disabled={disabled}
          >
            <SelectTrigger id={`${prefix}relationship`}>
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
          {getError('relationship') && (
            <p className="text-sm text-destructive">{getError('relationship').message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}phone`}>연락처 *</Label>
          <Input
            id={`${prefix}phone`}
            type="tel"
            placeholder="010-0000-0000"
            {...register(`${prefix}phone`)}
            disabled={disabled}
          />
          {getError('phone') && (
            <p className="text-sm text-destructive">{getError('phone').message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}email`}>이메일</Label>
          <Input
            id={`${prefix}email`}
            type="email"
            placeholder="example@email.com"
            {...register(`${prefix}email`)}
            disabled={disabled}
          />
          {getError('email') && (
            <p className="text-sm text-destructive">{getError('email').message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Legacy export for backward compatibility
export const GuardianForm = GuardianFormFields
