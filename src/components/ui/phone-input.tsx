'use client'

import * as React from 'react'
import { Input } from './input'

// ============================================================================
// Types
// ============================================================================

export interface PhoneInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  /**
   * The phone number value (unformatted, without hyphens)
   * Example: "01012345678"
   */
  value?: string

  /**
   * Callback when the value changes
   * @param value - Unformatted phone number (숫자만, 하이픈 제거됨)
   */
  onChange?: (value: string) => void

  /**
   * Placeholder text
   * @default "010-0000-0000"
   */
  placeholder?: string
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format phone number with hyphens for display
 *
 * @param value - Raw phone number (숫자만 또는 하이픈 포함)
 * @returns Formatted phone number with hyphens
 *
 * Examples:
 * - "010" → "010"
 * - "0101234" → "010-1234"
 * - "01012345678" → "010-1234-5678"
 * - "0212345678" → "02-1234-5678" (서울 지역번호)
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '')

  if (numbers.length === 0) return ''

  // 서울 지역번호 (02)
  if (numbers.startsWith('02')) {
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`
    }
  }

  // 일반 지역번호 및 휴대폰 번호 (010, 031, 032 등)
  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  } else if (numbers.length <= 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  } else {
    // 최대 11자리까지만 허용
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }
}

/**
 * Remove all non-digit characters from phone number
 *
 * @param value - Phone number with or without hyphens
 * @returns Unformatted phone number (숫자만)
 */
function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

// ============================================================================
// Component
// ============================================================================

/**
 * PhoneInput Component
 *
 * 스마트 전화번호 입력 컴포넌트
 *
 * ## 주요 기능
 * - 사용자에게는 하이픈이 자동으로 포맷되어 표시됨 (010-1234-5678)
 * - 부모 컴포넌트에는 순수 숫자만 전달됨 (01012345678)
 * - 숫자 외의 문자는 자동으로 제거됨
 * - 최대 11자리까지만 입력 가능
 *
 * ## 사용 예시
 *
 * ### React Hook Form과 함께 사용
 * ```tsx
 * const form = useForm()
 *
 * <PhoneInput
 *   value={form.watch('phone')}
 *   onChange={(value) => form.setValue('phone', value)}
 *   placeholder="휴대폰 번호"
 * />
 * ```
 *
 * ### 일반 상태 관리
 * ```tsx
 * const [phone, setPhone] = useState('')
 *
 * <PhoneInput
 *   value={phone}
 *   onChange={setPhone}
 * />
 * ```
 *
 * @example
 * // 사용자가 "01012345678"을 입력하면
 * // - 화면에는 "010-1234-5678"로 표시
 * // - onChange로는 "01012345678" 전달
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, placeholder = '010-0000-0000', ...rest }, ref) => {
    // Display value with hyphens (사용자에게 보여지는 값)
    const displayValue = formatPhoneNumber(value)

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // Remove all non-digit characters (숫자만 추출)
      const unformatted = unformatPhoneNumber(inputValue)

      // Limit to 11 digits (최대 11자리)
      const limited = unformatted.slice(0, 11)

      // Call parent onChange with unformatted value (하이픈 없는 순수 숫자 전달)
      onChange?.(limited)
    }

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        {...rest}
      />
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
