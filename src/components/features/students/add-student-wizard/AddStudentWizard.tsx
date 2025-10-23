'use client'

import { useState, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { PostgrestError } from '@supabase/supabase-js'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { hashKioskPin } from '@/app/actions/kiosk'
import { GUARDIAN_MODES } from '@/lib/constants'
import { getErrorMessage } from '@/lib/error-handlers'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { Step1_StudentInfo } from './Step1_StudentInfo'
import { Step2_GuardianInfo } from './Step2_GuardianInfo'
import { Step3_AdditionalInfo } from './Step3_AdditionalInfo'
import { studentWizardSchema, type StudentWizardFormValues, type StepInfo } from './types'
import { createGetTenantCodesUseCase } from '@/application/factories/tenantUseCaseFactory.client'
import { createCreateStudentCompleteUseCase } from '@/application/factories/studentUseCaseFactory.client'

// ============================================================================
// Props
// ============================================================================

interface AddStudentWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ============================================================================
// Main Component
// ============================================================================

export function AddStudentWizard({ open, onOpenChange, onSuccess }: AddStudentWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<string[]>([])

  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const steps: StepInfo[] = [
    { label: '학생 기본 정보', description: '필수 정보를 입력해주세요' },
    { label: '학부모 정보', description: '학부모를 검색하거나 새로 등록하세요' },
    { label: '추가 정보', description: '선택 사항을 입력해주세요' },
  ]

  const form = useForm<StudentWizardFormValues>({
    resolver: zodResolver(studentWizardSchema),
    mode: 'onTouched', // 사용자가 필드를 건드리고 포커스를 잃으면 즉시 검증
    defaultValues: {
      name: '',
      grade: '',
      school: '',
      gender: undefined,
      guardianMode: GUARDIAN_MODES.NEW,
      guardian: {
        name: '',
        phone: '',
        email: '',
        relationship: '',
        address: '',
        occupation: '',
      },
      existingGuardianId: '',
      studentPhone: '',
      email: '',
      enrollmentDate: new Date(),
      notes: '',
      commuteMethod: '',
      marketingSource: '',
      kioskPin: '',
      profileImage: '',
    },
  })

  const { handleSubmit, trigger } = form
  const guardianMode = form.watch('guardianMode')

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    if (open) {
      loadSchools()
    }
  }, [open])

  async function loadSchools() {
    try {
      const useCase = createGetTenantCodesUseCase()
      const codes = await useCase.execute('school')

      // 데이터가 있으면 사용, 없으면 기본 학교 목록 사용
      if (codes.length > 0) {
        setSchools(codes)
      } else {
        // tenant_codes 테이블이 비어있거나 없는 경우 기본 목록 사용
        const { DEFAULT_SCHOOLS } = await import('@/lib/constants')
        setSchools([...DEFAULT_SCHOOLS])
      }
    } catch (error) {
      // 테이블이 존재하지 않거나 RLS 에러 등이 발생하면 기본 목록 사용
      console.warn('tenant_codes 테이블을 사용할 수 없습니다. 기본 학교 목록을 사용합니다:', error)
      const { DEFAULT_SCHOOLS } = await import('@/lib/constants')
      setSchools([...DEFAULT_SCHOOLS])
    }
  }

  // ============================================================================
  // Step Navigation
  // ============================================================================

  async function handleNext() {
    let fieldsToValidate: (keyof StudentWizardFormValues)[] = []

    if (currentStep === 1) {
      fieldsToValidate = ['name', 'birthDate', 'grade', 'school']
    } else if (currentStep === 2) {
      // ✨ SKIP 모드일 때는 검증 없이 바로 다음 단계로 이동
      if (guardianMode === GUARDIAN_MODES.SKIP) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length))
        return
      }
      // refine이 guardianMode에 따라 자동으로 검증하므로, 모든 관련 필드를 검증
      fieldsToValidate = ['guardianMode', 'guardian', 'existingGuardianId']
    }

    // trigger는 스키마에 정의된 required_error와 refine을 기반으로 정확하게 작동합니다.
    const isValid = await trigger(fieldsToValidate)

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length))
    }
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  function handleSkipGuardian() {
    // guardianMode를 SKIP으로 설정하고 관련 필드 초기화
    form.setValue('guardianMode', GUARDIAN_MODES.SKIP)
    form.setValue('existingGuardianId', undefined)
    form.setValue('guardian', undefined)

    // guardian 관련 에러 메시지 제거
    form.clearErrors('guardian')
    form.clearErrors('existingGuardianId')

    // 즉시 다음 단계로 이동
    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }

  // ============================================================================
  // Form Submission
  // ============================================================================

  async function onSubmit(data: StudentWizardFormValues, closeAfter: boolean = true) {
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
      // Hash PIN if provided
      let hashedPin: string | null = null
      if (data.kioskPin && data.kioskPin.trim().length === 4) {
        hashedPin = await hashKioskPin(data.kioskPin)
      }

      // Prepare student data
      const studentData = {
        name: data.name,
        birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
        grade: data.grade,
        school: data.school || null,
        gender: data.gender || null,
        email: data.email || null,
        student_phone: data.studentPhone || null,
        profile_image_url: data.profileImage || null,
        enrollment_date: data.enrollmentDate ? format(data.enrollmentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        notes: data.notes || null,
        commute_method: data.commuteMethod || null,
        marketing_source: data.marketingSource || null,
        kiosk_pin: hashedPin,
      }

      // Prepare guardian data and mode
      let guardianData = null
      let guardianMode = 'skip'

      if (data.guardianMode === GUARDIAN_MODES.NEW && data.guardian) {
        guardianMode = 'new'
        guardianData = {
          name: data.guardian.name,
          phone: data.guardian.phone || null,
          email: data.guardian.email || null,
          relationship: data.guardian.relationship || null,
          occupation: data.guardian.occupation || null,
          address: data.guardian.address || null,
          is_primary_contact: true,
          receives_notifications: true,
          receives_billing: false,
          can_pickup: true,
        }
      } else if (data.guardianMode === GUARDIAN_MODES.EXISTING && data.existingGuardianId) {
        guardianMode = 'existing'
        guardianData = {
          id: data.existingGuardianId,
          is_primary_contact: true,
          receives_notifications: true,
          receives_billing: false,
          can_pickup: true,
        }
      }

      // Call CreateStudentComplete Use Case
      const useCase = createCreateStudentCompleteUseCase()
      const { success, data: responseData, error: useCaseError } = await useCase.execute({
        student: studentData,
        guardian: guardianData,
        guardianMode: guardianMode as 'new' | 'existing' | 'skip',
      })

      if (!success || useCaseError) {
        throw useCaseError || new Error('학생을 추가하는 중 오류가 발생했습니다.')
      }

      // Show success message based on guardian mode
      if (guardianMode === 'new' && data.guardian) {
        toast({
          title: '학생 및 학부모 추가 완료',
          description: `${data.name} 학생과 ${data.guardian.name} 학부모가 추가되었습니다.`,
        })
      } else if (guardianMode === 'existing') {
        toast({
          title: '학생 추가 및 학부모 연결 완료',
          description: `${data.name} 학생이 추가되고 기존 학부모와 연결되었습니다.`,
        })
      } else {
        const studentCode = responseData.student_code || ''
        toast({
          title: '학생 추가 완료',
          description: `${data.name} 학생이 추가되었습니다.${studentCode ? ` (학생 코드: ${studentCode})` : ''}`,
        })
      }

      // Reset form and close
      form.reset()
      setCurrentStep(1)
      onSuccess?.()

      if (closeAfter) {
        onOpenChange(false)
      }
    } catch (error: unknown) {
      console.error('학생 추가 오류:', error)

      // 상세한 오류 처리
      let errorMessage = '학생을 추가하는 중 오류가 발생했습니다.'

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (error && typeof error === 'object' && 'code' in error) {
        const pgError = error as PostgrestError

        switch (pgError.code) {
          case '23505': // unique_violation
            if (pgError.message.includes('student_code')) {
              errorMessage = '이미 등록된 학생 코드입니다. 다시 시도해주세요.'
            } else if (pgError.message.includes('email')) {
              errorMessage = '이미 등록된 이메일 주소입니다.'
            } else if (pgError.message.includes('phone')) {
              errorMessage = '이미 등록된 연락처입니다.'
            } else {
              errorMessage = '중복된 정보가 있습니다. 입력하신 정보를 확인해주세요.'
            }
            break

          case '23503': // foreign_key_violation
            errorMessage = '연결된 정보가 유효하지 않습니다. 학부모 정보를 다시 확인해주세요.'
            break

          case '23502': // not_null_violation
            errorMessage = '필수 입력 항목이 누락되었습니다. 모든 필수 항목을 입력해주세요.'
            break

          case '42501': // insufficient_privilege
            errorMessage = '이 작업을 수행할 권한이 없습니다. 관리자에게 문의해주세요.'
            break

          case '22P02': // invalid_text_representation
            errorMessage = '입력하신 데이터 형식이 올바르지 않습니다.'
            break

          case 'PGRST116': // 테이블이 존재하지 않음
            errorMessage = '데이터베이스 테이블에 접근할 수 없습니다. 관리자에게 문의해주세요.'
            break

          default:
            // 기타 PostgreSQL 에러
            if (pgError.message) {
              console.error('PostgreSQL 에러 상세:', pgError)
              errorMessage = `데이터베이스 오류: ${pgError.message}`
            }
        }
      }

      toast({
        title: '학생 추가 실패',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>학생 추가</DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} steps={steps} />

        <FormProvider {...form}>
          <form onSubmit={handleSubmit((data) => onSubmit(data, true))} className="space-y-6">
            {/* Step 1: 필수 정보 */}
            {currentStep === 1 && <Step1_StudentInfo schools={schools} />}

            {/* Step 2: 학부모 정보 */}
            {currentStep === 2 && <Step2_GuardianInfo />}

            {/* Step 3: 추가 정보 */}
            {currentStep === 3 && <Step3_AdditionalInfo />}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  이전
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < steps.length ? (
                <>
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSkipGuardian}
                    >
                      나중에 입력하기
                    </Button>
                  )}
                  <Button type="button" onClick={handleNext}>
                    다음
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit((data) => onSubmit(data, false))()}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      '저장 후 계속 추가'
                    )}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      '저장 후 닫기'
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
