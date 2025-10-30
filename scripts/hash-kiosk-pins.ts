/**
 * Hash all existing plaintext kiosk PINs in the database
 * Run with: npx tsx scripts/hash-kiosk-pins.ts
 */

import bcrypt from 'bcryptjs'
import { createServiceRoleClient } from '../src/lib/supabase/service-role'

async function hashKioskPins() {
  const supabase = createServiceRoleClient()

  // 1. Get all students with plaintext PINs (length = 4, not hashed)
  const { data: students, error: fetchError } = await supabase
    .from('students')
    .select('id, student_code, name, kiosk_pin')
    .not('kiosk_pin', 'is', null)
    .is('deleted_at', null)

  if (fetchError) {
    console.error('❌ Failed to fetch students:', fetchError)
    process.exit(1)
  }

  if (!students || students.length === 0) {
    console.log('✅ No students with kiosk_pin found')
    return
  }

  console.log(`Found ${students.length} students with kiosk_pin`)

  // 2. Filter students with plaintext PINs (bcrypt hashes start with $2a$ or $2b$)
  const plaintextStudents = students.filter(
    (s) => s.kiosk_pin && !s.kiosk_pin.startsWith('$2')
  )

  console.log(`Found ${plaintextStudents.length} students with plaintext PINs`)

  if (plaintextStudents.length === 0) {
    console.log('✅ All PINs are already hashed')
    return
  }

  // 3. Hash each PIN and update
  let successCount = 0
  let errorCount = 0

  for (const student of plaintextStudents) {
    try {
      const hashedPin = await bcrypt.hash(student.kiosk_pin!, 10)

      const { error: updateError } = await supabase
        .from('students')
        .update({ kiosk_pin: hashedPin })
        .eq('id', student.id)

      if (updateError) {
        console.error(
          `❌ Failed to update ${student.student_code} (${student.name}):`,
          updateError
        )
        errorCount++
      } else {
        console.log(
          `✅ Hashed PIN for ${student.student_code} (${student.name})`
        )
        successCount++
      }
    } catch (err) {
      console.error(
        `❌ Error processing ${student.student_code} (${student.name}):`,
        err
      )
      errorCount++
    }
  }

  console.log('\n=== Summary ===')
  console.log(`✅ Successfully hashed: ${successCount}`)
  console.log(`❌ Errors: ${errorCount}`)
}

hashKioskPins()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err)
    process.exit(1)
  })
