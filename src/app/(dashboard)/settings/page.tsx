import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import {
  Settings,
  Building2,
  User,
  Bell,
  Lock,
  Palette,
  Database,
  HelpCircle,
} from 'lucide-react'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES } from '@/lib/constants'
import { Separator } from '@ui/separator'
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '설정',
  description: '학원 시스템 설정 및 개인화',
}

export default async function SettingsPage() {
  // Verify authentication
  await requireAuth()

  // Get current user and tenant info
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch user details
  const { data: userDetails } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, plan')
    .eq('id', userDetails?.tenant_id)
    .single()

  // System info
  const systemInfo = {
    version: 'v1.0.0',
    academyName: tenant?.name || 'Acadesk 학원',
    plan: tenant?.plan || 'free',
    lastBackup: new Date().toISOString().split('T')[0], // Current date as placeholder
  }

  return (
    <PageWrapper>
      <SettingsClient systemInfo={systemInfo} />
    </PageWrapper>
  )
}
