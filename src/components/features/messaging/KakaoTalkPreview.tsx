'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@ui/badge'

/**
 * 카카오 알림톡 미리보기 컴포넌트
 *
 * 템플릿 본문(`#{변수}`)을 샘플 값으로 치환해 실제 카카오톡 채팅창과 유사한 모양으로 렌더링.
 * 학원장이 "전송 시 어떻게 보일지" 직관적으로 파악하도록 한다.
 */

const DEFAULT_SAMPLES: Record<string, string> = {
  학원명: '진영오름영어',
  보호자명: '홍길동',
  학생명: '김민수',
  시간: '15:30',
  날짜: '2026-05-16',
  학원연락처: '055-123-4567',
  과목명: '영어',
  숙제명: 'Wonders Unit 1 단어 50개',
  마감일: '5/18 (월)',
  기간: '2026년 5월 1주차',
  리포트링크: 'https://acadesk.com/r/abc123',
  상담일시: '5/20 (화) 14:00',
  상담일: '5/19 (월)',
  담당자명: '박선생님',
  시험명: '5월 단어 시험',
  시험일시: '5/22 (목) 16:00',
  시험범위: 'Unit 1-3',
  재시험일시: '5/25 (일) 10:00',
  수업명: '초등 영어 A반',
  보강일시: '5/24 (토) 13:00',
  휴원일자: '5/30 ~ 6/1',
  휴원사유: '내부 워크샵',
  시작일: '6/1 (월)',
  퇴원일: '5/31 (일)',
  도서명: 'Wonders 1A',
  반납일: '5/20 (수)',
  상담링크: 'https://acadesk.com/c/xyz789',
  성적링크: 'https://acadesk.com/g/abc456',
  이전일정: '월/수 18:00',
  변경일정: '화/목 18:30',
  적용일: '6/1 (월)',
  결제금액: '200,000원',
  결제일: '2026-05-16',
  납부월: '5월',
  납부금액: '200,000원',
  납부기한: '5/25 (월)',
}

interface KakaoTalkPreviewProps {
  /** 템플릿 본문 (#{변수} 포함) */
  content: string
  /** 변수 이름 목록 (배지 표시용) */
  variables?: string[]
  /** 채널/발신 학원명 */
  channelName?: string
  /** 사용자 지정 샘플 값 (DEFAULT_SAMPLES 보다 우선) */
  sampleValues?: Record<string, string>
  /** 변수 매핑 노출 여부 */
  showVariableMap?: boolean
  className?: string
}

export function KakaoTalkPreview({
  content,
  variables = [],
  channelName,
  sampleValues,
  showVariableMap = true,
  className,
}: KakaoTalkPreviewProps) {
  const { substituted, mapping } = useMemo(() => {
    const used: Array<[string, string]> = []
    const out = content.replace(/#{([^}]+)}/g, (_, name: string) => {
      const value =
        sampleValues?.[name] ??
        DEFAULT_SAMPLES[name] ??
        (channelName && name === '학원명' ? channelName : null) ??
        `[${name}]`
      used.push([name, value])
      return value
    })
    return { substituted: out, mapping: used }
  }, [content, sampleValues, channelName])

  const displayChannel = channelName ?? DEFAULT_SAMPLES['학원명']

  // 변수 매핑은 중복 제거
  const uniqueMapping = Array.from(new Map(mapping).entries())

  return (
    <div className={cn('space-y-2', className)}>
      {/* 카카오톡 채팅창 모킹 */}
      <div className="rounded-2xl bg-[#A6C0CF] p-3 max-w-sm">
        {/* 발신자 라벨 */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <div className="h-6 w-6 rounded-full bg-[#FFE600] flex items-center justify-center text-[10px] font-bold text-black">
            ⓚ
          </div>
          <span className="text-[11px] text-white/90 font-medium">{displayChannel}</span>
        </div>

        {/* 알림톡 버블 */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {/* 노란 알림톡 헤더 */}
          <div className="bg-[#FFE600] px-3 py-1.5">
            <span className="text-[11px] font-semibold text-black/80">알림톡 도착</span>
          </div>

          {/* 본문 */}
          <div className="px-4 py-3.5 text-[13px] leading-relaxed text-zinc-900 whitespace-pre-wrap break-words">
            {substituted}
          </div>
        </div>
      </div>

      {/* 변수 매핑 표 */}
      {showVariableMap && (variables.length > 0 || uniqueMapping.length > 0) && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-2.5">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
            변수 치환 (미리보기 샘플 값)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(uniqueMapping.length > 0
              ? uniqueMapping
              : variables.map((v) => [v, DEFAULT_SAMPLES[v] ?? `[${v}]`] as [string, string])
            ).map(([name, value]) => (
              <Badge
                key={name}
                variant="outline"
                className="font-mono text-[10px] gap-1 px-1.5 py-0 h-5"
              >
                <span className="text-muted-foreground">{'#{' + name + '}'}</span>
                <span className="text-muted-foreground/60">→</span>
                <span>{value}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
