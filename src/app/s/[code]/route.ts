/**
 * Short URL Redirect Route (Shorter Path)
 *
 * /s/{code} -> 실제 리포트 URL로 리다이렉트
 * 문자 메시지용 더 짧은 경로
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidShortCode } from '@/lib/short-url'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // 1. 단축 코드 유효성 검증
    if (!isValidShortCode(code)) {
      return NextResponse.json(
        { error: '유효하지 않은 링크입니다' },
        { status: 400 }
      )
    }

    // 2. Supabase 클라이언트 생성
    const supabase = await createClient()

    // 3. 단축 URL 조회 (RLS 없이 public access)
    const { data: shortUrl, error } = await supabase
      .from('short_urls')
      .select('target_url, is_active, expires_at, id')
      .eq('short_code', code)
      .is('deleted_at', null)
      .maybeSingle()

    if (error || !shortUrl) {
      return NextResponse.json(
        { error: '링크를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 4. 링크 활성화 및 만료 확인
    if (!shortUrl.is_active) {
      return NextResponse.json(
        { error: '비활성화된 링크입니다' },
        { status: 410 }
      )
    }

    if (shortUrl.expires_at && new Date(shortUrl.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 링크입니다' },
        { status: 410 }
      )
    }

    // 5. 클릭 카운트 증가 (RPC 함수 호출)
    await supabase.rpc('increment_short_url_click', {
      p_short_code: code,
    })

    // 6. 리다이렉트
    return NextResponse.redirect(shortUrl.target_url, { status: 302 })
  } catch (error) {
    console.error('[Short URL Redirect] Error:', error)
    return NextResponse.json(
      { error: '링크 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
