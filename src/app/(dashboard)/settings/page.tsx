import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const [, supabase] = await Promise.all([requireAuth(), createClient()])
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userDetails } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = userDetails?.tenant_id
  const { data: tenant } = tenantId
    ? await supabase
        .from('tenants')
        .select('name, plan')
        .eq('id', tenantId)
        .single()
    : { data: null }

  const systemInfo = {
    version: 'v1.0.0',
    academyName: tenant?.name || 'Acadesk 학원',
    plan: tenant?.plan || 'free',
    lastBackup: new Date().toISOString().split('T')[0],
  }

  return <SettingsClient systemInfo={systemInfo} />
}
