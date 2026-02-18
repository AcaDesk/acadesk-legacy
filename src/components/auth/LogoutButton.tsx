'use client'

import { Loader2, LogOut } from 'lucide-react'
import { Button } from '@ui/button'
import { useLogout } from '@/hooks/use-logout'

export function LogoutButton() {
  const { logout, isLoading } = useLogout()

  return (
    <Button
      onClick={logout}
      variant="outline"
      className="w-full"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로그아웃 중...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </>
      )}
    </Button>
  )
}
