'use client'

import Link from 'next/link'
import { Button } from '@ui/button'
import { Plus, FileText } from 'lucide-react'
import { RoleGuard } from '@/components/auth/role-guard'

export function TodoPageActions() {
  return (
    <RoleGuard allowedRoles={['owner', 'instructor']}>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/todos/templates">
            <FileText className="h-4 w-4 mr-2" />
            템플릿 관리
          </Link>
        </Button>
        <Button asChild>
          <Link href="/todos/new">
            <Plus className="h-4 w-4 mr-2" />
            TODO 생성
          </Link>
        </Button>
      </div>
    </RoleGuard>
  )
}
