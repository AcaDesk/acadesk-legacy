/**
 * RoleGuard Component
 *
 * Protects routes based on user role
 * Uses service_role-based auth helpers
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const router = useRouter()
  const { user, isLoading, error } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return

    if (error || !user) {
      router.push('/auth/login')
      return
    }

    if (!user.roleCode || !allowedRoles.includes(user.roleCode)) {
      router.push('/dashboard')
    }
  }, [user, isLoading, error, allowedRoles, router])

  if (isLoading) {
    return fallback || <div>Loading...</div>
  }

  if (error || !user) {
    return null
  }

  if (!user.roleCode || !allowedRoles.includes(user.roleCode)) {
    return null
  }

  return <>{children}</>
}
