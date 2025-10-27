/**
 * Short URL Redirect Page
 *
 * /s/[code] -> 단축 URL을 실제 URL로 리다이렉트
 */

import { redirect, notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface ShortUrlPageProps {
  params: Promise<{
    code: string
  }>
}

export default async function ShortUrlPage({ params }: ShortUrlPageProps) {
  const { code } = await params

  // 1. Service role client 생성 (인증 없이 접근 가능)
  const supabase = createServiceRoleClient()

  // 2. 단축 코드로 URL 조회
  const { data: shortUrl, error } = await supabase
    .from('short_urls')
    .select('target_url, click_count')
    .eq('short_code', code)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !shortUrl) {
    notFound()
  }

  // 3. 클릭 카운트 증가 (비동기, 실패해도 무시)
  // Note: await 하지 않으므로 리다이렉트를 차단하지 않음
  supabase
    .from('short_urls')
    .update({
      click_count: (shortUrl.click_count || 0) + 1,
      last_clicked_at: new Date().toISOString(),
    })
    .eq('short_code', code)
    .then(({ error: updateError }) => {
      if (updateError) {
        console.error('Failed to update click count:', updateError)
      }
    })

  // 4. 리다이렉트
  redirect(shortUrl.target_url)
}
