'use client'

import { useEffect } from 'react'
import { useForm, UseFormReturn, Path, FieldValues } from 'react-hook-form'
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
  occupation: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
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
interface GuardianFormFieldsProps<T extends FieldValues = GuardianFormValues> {
  form: UseFormReturn<T>
  prefix?: string
  disabled?: boolean
}

export function GuardianFormFields<T extends FieldValues = GuardianFormValues>({
  form,
  prefix = '',
  disabled = false
}: GuardianFormFieldsProps<T>) {
  const { register, setValue, watch, formState: { errors } } = form

  const phoneValue = watch(`${prefix}phone` as Path<T>)
  const relationshipValue = watch(`${prefix}relationship` as Path<T>)

  // Auto-format phone number
  useEffect(() => {
    if (phoneValue && typeof phoneValue === 'string') {
      const formatted = formatPhoneNumber(phoneValue)
      if (formatted !== phoneValue) {
        setValue(`${prefix}phone` as Path<T>, formatted as never, { shouldValidate: true })
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

  const getError = (field: string): { message?: string } | undefined => {
    const keys = `${prefix}${field}`.split('.')

    let error: Record<string, unknown> = errors as Record<string, unknown>
    for (const key of keys) {
      if (error && typeof error === 'object' && key in error) {
        error = error[key] as Record<string, unknown>
      } else {
        return undefined
      }
    }
    return error as { message?: string } | undefined
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
            {...register(`${prefix}name` as Path<T>)}
            disabled={disabled}
          />
          {getError('name') && (
            <p className="text-sm text-destructive">{getError('name')?.message}</p>
          )}
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}relationship`}>관계 *</Label>
          <Select
            value={(relationshipValue as string | undefined) || ''}
            onValueChange={(value) => setValue(`${prefix}relationship` as Path<T>, value as never)}
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
            <p className="text-sm text-destructive">{getError('relationship')?.message}</p>
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
            {...register(`${prefix}phone` as Path<T>)}
            disabled={disabled}
          />
          {getError('phone') && (
            <p className="text-sm text-destructive">{getError('phone')?.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}email`}>이메일</Label>
          <Input
            id={`${prefix}email`}
            type="email"
            placeholder="example@email.com"
            {...register(`${prefix}email` as Path<T>)}
            disabled={disabled}
          />
          {getError('email') && (
            <p className="text-sm text-destructive">{getError('email')?.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Legacy export for backward compatibility
export const GuardianForm = GuardianFormFields
