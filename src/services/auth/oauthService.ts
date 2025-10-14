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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
