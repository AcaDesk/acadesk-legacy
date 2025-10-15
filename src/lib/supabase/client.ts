import { createBrowserClient } from "@supabase/ssr"

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 개발 환경에서 환경 변수 검증
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase 환경 변수가 설정되지 않았습니다!")
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ 설정됨" : "❌ 누락")
    console.error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseAnonKey ? "✅ 설정됨" : "❌ 누락"
    )
    throw new Error(
      "Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하고 개발 서버를 재시작하세요."
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
