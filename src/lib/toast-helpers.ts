/**
 * Toast Helper Utilities
 *
 * 일관된 토스트 사용을 위한 헬퍼 함수들
 * - 중복 코드 제거
 * - 자동으로 getErrorMessage 적용
 * - 일관된 UX 제공
 */

import { toast } from '@/hooks/use-toast'
import { getErrorMessage } from './error-handlers'

/**
 * Toast 설정
 */
export const TOAST_CONFIG = {
  /** 성공 메시지 표시 시간 (ms) */
  SUCCESS_DURATION: 5000,
  /** 에러 메시지 표시 시간 (ms) - 사용자가 읽을 시간 필요 */
  ERROR_DURATION: 7000,
  /** 정보 메시지 표시 시간 (ms) */
  INFO_DURATION: 5000,
  /** 경고 메시지 표시 시간 (ms) */
  WARNING_DURATION: 6000,
} as const

/**
 * 성공 토스트 표시
 *
 * @example
 * showSuccessToast('학생 등록 완료', '새 학생이 등록되었습니다.')
 */
export function showSuccessToast(title: string, description?: string) {
  return toast({
    title,
    description,
    duration: TOAST_CONFIG.SUCCESS_DURATION,
  })
}

/**
 * 에러 토스트 표시 (자동으로 getErrorMessage 적용)
 *
 * @example
 * catch (error) {
 *   showErrorToast('학생 등록 실패', error, 'StudentForm.onSubmit')
 * }
 */
export function showErrorToast(
  title: string,
  error: unknown,
  context?: string
) {
  return toast({
    title,
    description: getErrorMessage(error, context),
    variant: 'destructive',
    duration: TOAST_CONFIG.ERROR_DURATION,
  })
}

/**
 * 정보 토스트 표시
 *
 * @example
 * showInfoToast('안내', '이 기능은 준비 중입니다.')
 */
export function showInfoToast(title: string, description?: string) {
  return toast({
    title,
    description,
    duration: TOAST_CONFIG.INFO_DURATION,
  })
}

/**
 * 경고 토스트 표시
 *
 * @example
 * showWarningToast('입력 필요', '학생을 선택해주세요.')
 */
export function showWarningToast(title: string, description?: string) {
  return toast({
    title,
    description,
    variant: 'destructive',
    duration: TOAST_CONFIG.WARNING_DURATION,
  })
}

/**
 * 유효성 검사 에러 토스트 표시
 *
 * @example
 * if (!studentId) {
 *   showValidationToast('학생을 선택해주세요.')
 *   return
 * }
 */
export function showValidationToast(message: string) {
  return toast({
    title: '입력 오류',
    description: message,
    variant: 'destructive',
    duration: TOAST_CONFIG.WARNING_DURATION,
  })
}

/**
 * 로딩 토스트 표시 (수동으로 dismiss 필요)
 *
 * @example
 * const loadingToast = showLoadingToast('처리 중...')
 * try {
 *   await someOperation()
 *   loadingToast.dismiss()
 *   showSuccessToast('완료')
 * } catch (error) {
 *   loadingToast.dismiss()
 *   showErrorToast('실패', error)
 * }
 */
export function showLoadingToast(message: string) {
  return toast({
    title: message,
    description: '잠시만 기다려주세요...',
    duration: Infinity, // 수동으로 dismiss해야 함
  })
}

/**
 * Promise 기반 작업에 대한 토스트 (로딩 → 성공/에러 자동 처리)
 *
 * @example
 * await toastPromise(
 *   createStudent(data),
 *   {
 *     loading: '학생 등록 중...',
 *     success: '학생이 등록되었습니다.',
 *     error: '학생 등록 실패'
 *   },
 *   'StudentForm.onSubmit'
 * )
 */
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string
    error: string
  },
  context?: string
): Promise<T> {
  const loadingToast = showLoadingToast(messages.loading)

  try {
    const result = await promise
    loadingToast.dismiss()
    showSuccessToast(messages.success)
    return result
  } catch (error) {
    loadingToast.dismiss()
    showErrorToast(messages.error, error, context)
    throw error
  }
}

/**
 * 복사 완료 토스트
 *
 * @example
 * await navigator.clipboard.writeText(text)
 * showCopyToast()
 */
export function showCopyToast(message: string = '클립보드에 복사되었습니다.') {
  return toast({
    title: '복사 완료',
    description: message,
    duration: 3000, // 짧게 표시
  })
}

/**
 * 삭제 확인 토스트
 *
 * @example
 * showDeleteToast('학생이 삭제되었습니다.')
 *
 * @note 되돌리기 버튼이 필요한 경우, 직접 toast()를 사용하여 action을 전달하세요.
 */
export function showDeleteToast(message: string) {
  return toast({
    title: '삭제 완료',
    description: message,
    duration: TOAST_CONFIG.SUCCESS_DURATION,
  })
}

/**
 * 네트워크 에러 전용 토스트
 *
 * @example
 * catch (error) {
 *   if (isNetworkError(error)) {
 *     showNetworkErrorToast()
 *   }
 * }
 */
export function showNetworkErrorToast() {
  return toast({
    title: '네트워크 오류',
    description: '인터넷 연결을 확인하고 다시 시도해주세요.',
    variant: 'destructive',
    duration: TOAST_CONFIG.ERROR_DURATION,
  })
}

/**
 * 권한 에러 전용 토스트
 *
 * @example
 * if (user.role !== 'owner') {
 *   showPermissionErrorToast()
 *   return
 * }
 */
export function showPermissionErrorToast(
  message: string = '이 작업을 수행할 권한이 없습니다.'
) {
  return toast({
    title: '권한 없음',
    description: message,
    variant: 'destructive',
    duration: TOAST_CONFIG.ERROR_DURATION,
  })
}
