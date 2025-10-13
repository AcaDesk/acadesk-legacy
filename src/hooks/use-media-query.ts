import { useState, useEffect } from 'react'

/**
 * 미디어 쿼리를 감지하는 React Hook
 *
 * @param query - CSS 미디어 쿼리 문자열 (예: "(min-width: 768px)")
 * @returns 미디어 쿼리 매칭 여부
 *
 * @example
 * const isDesktop = useMediaQuery("(min-width: 1024px)")
 * const isMobile = useMediaQuery("(max-width: 767px)")
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)

    // 초기값 설정
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    // 변경 감지 리스너
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // 최신 브라우저 API
    if (media.addEventListener) {
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    } else {
      // 구형 브라우저 호환성
      media.addListener(listener)
      return () => media.removeListener(listener)
    }
  }, [matches, query])

  return matches
}

/**
 * 주요 브레이크포인트 헬퍼
 */
export const useBreakpoint = () => {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return {
    isMobile,
    isTablet,
    isDesktop,
  }
}
