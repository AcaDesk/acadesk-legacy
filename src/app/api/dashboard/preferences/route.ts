/**
 * Dashboard Preferences API Route
 *
 * POST has been replaced by Server Actions.
 * Use saveDashboardPreferences() from @/app/actions/dashboard-preferences
 *
 * GET is still available for reading preferences.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DashboardPreferences } from '@/types/dashboard'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const preferences: DashboardPreferences = data?.preferences?.dashboard || null

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Failed to fetch dashboard preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dashboard/preferences
 * REMOVED - Use Server Action instead
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Use Server Actions instead.',
      migration: {
        old: 'POST /api/dashboard/preferences',
        new: 'saveDashboardPreferences() from @/app/actions/dashboard-preferences'
      }
    },
    { status: 410 } // 410 Gone
  )
}
