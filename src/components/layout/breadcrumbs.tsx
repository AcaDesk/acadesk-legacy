'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Breadcrumb, type BreadcrumbItem } from '@ui/breadcrumb'
import {
  BREADCRUMB_CONFIG,
  matchPathPattern,
  extractDynamicSegment,
} from '@/lib/breadcrumb-config'

/**
 * 중앙 집중식 브래드크럼 컴포넌트
 *
 * 현재 pathname을 기반으로 자동으로 브래드크럼을 생성합니다.
 * - 정적 경로는 설정 파일의 레이블을 사용
 * - 동적 경로는 비동기 데이터 페칭 함수를 실행하여 실제 데이터 이름을 표시
 */
export function Breadcrumbs() {
  const pathname = usePathname()
  const [items, setItems] = useState<BreadcrumbItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generateBreadcrumbs = async () => {
      setLoading(true)

      // 홈(/) 경로는 브래드크럼을 표시하지 않음
      if (pathname === '/') {
        setItems([])
        setLoading(false)
        return
      }

      const breadcrumbItems: BreadcrumbItem[] = []
      const pathSegments = pathname.split('/').filter(Boolean)

      // 홈 링크 추가 (대시보드로 이동)
      breadcrumbItems.push({ label: '홈', href: '/dashboard' })

      // 각 세그먼트에 대해 브래드크럼 아이템 생성
      let currentPath = ''
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i]
        currentPath += `/${segment}`

        // 설정에서 매칭되는 경로 패턴 찾기
        const configKey = Object.keys(BREADCRUMB_CONFIG).find((key) =>
          matchPathPattern(key, currentPath)
        )

        let label = segment
        const config = configKey ? BREADCRUMB_CONFIG[configKey] : undefined

        if (typeof config === 'function') {
          // 동적 경로: 비동기 함수를 실행하여 실제 데이터 이름 가져오기
          const dynamicSegment = extractDynamicSegment(configKey!, currentPath)
          if (dynamicSegment) {
            try {
              label = await config(dynamicSegment)
            } catch (error) {
              console.error(
                `[Breadcrumb] Error fetching dynamic segment for ${currentPath}:`,
                error
              )
              label = segment
            }
          }
        } else if (typeof config === 'string') {
          // 정적 경로: 설정 파일의 레이블 사용
          label = config
        } else {
          // 설정에 없는 경로: 세그먼트를 그대로 사용 (첫 글자 대문자)
          label = segment.charAt(0).toUpperCase() + segment.slice(1)
        }

        // 마지막 아이템은 href 없음 (현재 페이지)
        const isLast = i === pathSegments.length - 1
        breadcrumbItems.push({
          label,
          href: isLast ? undefined : currentPath,
        })
      }

      setItems(breadcrumbItems)
      setLoading(false)
    }

    generateBreadcrumbs()
  }, [pathname])

  // 로딩 중에는 스켈레톤 UI 표시
  if (loading) {
    return (
      <div className="mb-4 h-5 w-1/3 animate-pulse rounded bg-muted" aria-label="브래드크럼 로딩 중" />
    )
  }

  // 홈 경로이거나 아이템이 없으면 렌더링하지 않음
  if (items.length === 0) {
    return null
  }

  return <Breadcrumb items={items} />
}
