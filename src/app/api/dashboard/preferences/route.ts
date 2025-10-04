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

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preferences } = body as { preferences: DashboardPreferences }

    if (!preferences) {
      return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 })
    }

    // Get current preferences
    const { data: currentData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const currentPreferences = currentData?.preferences || {}

    // Update dashboard preferences
    const { error } = await supabase
      .from('users')
      .update({
        preferences: {
          ...currentPreferences,
          dashboard: preferences
        }
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    console.error('Failed to save dashboard preferences:', error)
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}
