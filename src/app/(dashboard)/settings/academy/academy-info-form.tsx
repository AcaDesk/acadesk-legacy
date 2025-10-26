'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { PhoneInput } from '@ui/phone-input'
import { Textarea } from '@ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateAcademyInfo } from '@/app/actions/academy'

// ============================================================================
// Types & Schemas
// ============================================================================

const academyFormSchema = z.object({
  name: z.string().min(1, '학원명은 필수입니다'),
  business_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('유효한 이메일을 입력하세요').optional().or(z.literal('')),
  address: z.string().optional(),
  website: z.string().url('유효한 URL을 입력하세요').optional().or(z.literal('')),
})

type AcademyFormValues = z.infer<typeof academyFormSchema>

interface AcademyInfoFormProps {
  initialData: any
}

// ============================================================================
// Component
// ============================================================================

export function AcademyInfoForm({ initialData }: AcademyInfoFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Form setup
  const form = useForm<AcademyFormValues>({
    resolver: zodResolver(academyFormSchema),
    defaultValues: {
      name: initialData.name || '',
      business_number: initialData.business_number || '',
      phone: initialData.phone || '',
      email: initialData.email || '',
      address: initialData.address || '',
      website: initialData.website || '',
    },
  })

  // Check if form has changes
  const hasChanges = form.formState.isDirty

  async function onSubmit(values: AcademyFormValues) {
    setIsLoading(true)

    try {
      const result = await updateAcademyInfo({
        name: values.name,
        business_number: values.business_number || null,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        website: values.website || null,
      })

      if (!result.success) {
        throw new Error(result.error || '학원 정보 수정에 실패했습니다')
      }

      toast({
        title: '학원 정보 수정 완료',
        description: '학원 정보가 성공적으로 수정되었습니다.',
      })

      // Reset form dirty state with current values
      form.reset(values)
      router.refresh()
    } catch (error) {
      console.error('Error updating academy info:', error)
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '학원 정보 수정 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>학원의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>학원명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 아카데스크 학원" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사업자 등록번호</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 123-45-67890" {...field} />
                  </FormControl>
                  <FormDescription>'-'를 포함하여 입력하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 전화번호</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="예: 02-1234-5678"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>대표 이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="예: contact@acadesk.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>주소</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="학원의 전체 주소를 입력하세요"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>웹사이트</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="예: https://www.acadesk.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>https:// 를 포함하여 입력하세요</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 설정</CardTitle>
            <CardDescription>시스템 관련 설정입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-2">시간대</p>
                <Input value="Asia/Seoul (한국)" disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  시간대는 변경할 수 없습니다
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">통화</p>
                <Input value="KRW (원)" disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  통화는 변경할 수 없습니다
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">학원 ID</p>
              <Input value={initialData.id} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                고유 식별자로 변경할 수 없습니다
              </p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">가입일</p>
              <Input
                value={new Date(initialData.created_at).toLocaleDateString('ko-KR')}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button type="submit" disabled={isLoading || !hasChanges}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && <Save className="mr-2 h-4 w-4" />}
            {hasChanges ? '변경사항 저장' : '저장됨'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
