import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

export interface LoadingButtonProps extends ButtonProps {
  /**
   * 로딩 상태
   * true일 때 버튼이 비활성화되고 스피너가 표시됩니다
   */
  loading?: boolean
  /**
   * 로딩 중일 때 표시할 텍스트
   * 지정하지 않으면 children을 그대로 표시합니다
   */
  loadingText?: string
}

/**
 * Loading Button Component
 *
 * 로딩 상태를 자동으로 처리하는 버튼 컴포넌트입니다.
 * 로딩 중일 때 스피너 아이콘과 함께 버튼이 비활성화됩니다.
 *
 * @example
 * ```tsx
 * const [isSubmitting, setIsSubmitting] = useState(false)
 *
 * <LoadingButton
 *   loading={isSubmitting}
 *   loadingText="저장 중..."
 *   onClick={handleSubmit}
 * >
 *   저장
 * </LoadingButton>
 * ```
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loading, loadingText, disabled, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={loading || disabled} {...props}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'
