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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
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
