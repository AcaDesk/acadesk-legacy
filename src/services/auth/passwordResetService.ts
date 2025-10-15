/**
 * Password Reset Service
 * Data Access Layer for password reset logic
 */

import { createClient } from "@/lib/supabase/client"

export const passwordResetService = {
  /**
   * Send password reset email
   */
  async sendResetEmail(email: string) {
    const supabase = createClient()

    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    return { error }
  },

  /**
   * Update password with new password
   */
  async updatePassword(newPassword: string) {
    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { error }
  },
}
