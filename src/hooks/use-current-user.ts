/**
 * Custom hook to get current user and tenant information
 * Automatically creates user in public.users if not exists
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CurrentUser {
  id: string
  tenantId: string
  email: string | null
  name: string
  roleCode: string
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get auth user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError
      if (!authUser) throw new Error('Not authenticated')

      // Get user data from public.users
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, tenant_id, email, name, role_code')
        .eq('id', authUser.id)
        .maybeSingle()

      if (userError) {
        console.error('Error fetching user data:', userError)
        throw new Error(`Failed to fetch user data: ${userError.message}`)
      }

      // If user doesn't exist in public.users, create it
      if (!userData) {
        console.log('Creating user in public.users for auth user:', authUser.id)
        const { data: newUserData, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            tenant_id: DEFAULT_TENANT_ID,
            email: authUser.email,
            name: authUser.email?.split('@')[0] || 'User',
            role_code: 'admin',
          })
          .select('id, tenant_id, email, name, role_code')
          .maybeSingle()

        if (createError) {
          console.error('Error creating user:', createError)
          throw new Error(`Failed to create user: ${createError.message}`)
        }

        userData = newUserData
      }

      if (!userData) {
        throw new Error('User data not found')
      }

      if (!userData.tenant_id) {
        throw new Error('User has no tenant_id')
      }

      setUser({
        id: userData.id,
        tenantId: userData.tenant_id,
        email: userData.email,
        name: userData.name,
        roleCode: userData.role_code,
      })
    } catch (err) {
      console.error('Error in useCurrentUser:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  }
}
