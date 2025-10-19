'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { RoleGuard } from '@/components/auth/role-guard'

export function TodoPageActions() {
  return (
    <RoleGuard allowedRoles={['owner', 'instructor']}>
      <div className="flex gap-2">
        <Link href="/todos/templates">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            템플릿 관리
          </Button>
        </Link>
        <Link href="/todos/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            TODO 생성
          </Button>
        </Link>
      </div>
    </RoleGuard>
  )
}
