import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkTables() {
  console.log('🔍 Checking existing tables in Supabase...\n')

  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')
    .order('table_name')

  if (error) {
    console.error('❌ Error:', error.message)

    // Try alternative method - check if specific tables exist
    console.log('\n📋 Checking specific tables...\n')

    const tablesToCheck = [
      'tenants',
      'user_profiles',
      'students',
      'guardians',
      'classes',
      'attendance',
      'assessment_types',
      'assessment_results',
      'materials',
      'books',
      'book_loans',
    ]

    for (const table of tablesToCheck) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count')
          .limit(0)

        if (tableError) {
          console.log(`❌ ${table}: NOT FOUND`)
        } else {
          console.log(`✅ ${table}: EXISTS`)
        }
      } catch (e) {
        console.log(`❌ ${table}: ERROR`)
      }
    }

    return
  }

  console.log('✅ Found tables:')
  data.forEach((row: { table_name: string }) => {
    console.log(`  - ${row.table_name}`)
  })
}

checkTables()
