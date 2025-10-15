/**
 * OAuth Service
 * Data Access Layer for OAuth authentication
 */

import { createClient } from "@/lib/supabase/client"
import type { OAuthProvider } from "@/types/auth.types"

export const oauthService = {
  /**
   * Initiate OAuth login with provider
   */
  async signInWithOAuth(provider: OAuthProvider) {
    const supabase = createClient()

    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    return { data, error }
  },

  /**
   * Sign up with OAuth provider (same as sign in for OAuth)
   */
  async signUpWithOAuth(provider: OAuthProvider) {
    return this.signInWithOAuth(provider)
  },
}
