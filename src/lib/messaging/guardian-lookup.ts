/**
 * 보호자 전화번호 조회 유틸리티
 *
 * 학생 ID로 보호자 연락처를 조회하는 공통 패턴을 통합.
 * event-alimtalk.ts 등에서 사용.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface GuardianContact {
  guardianId: string
  name: string
  phone: string
}

/**
 * 학생의 보호자 연락처 목록 조회
 *
 * student_guardians → guardians (phone, users.phone) 순으로 전화번호 탐색
 * phone이 없는 보호자는 제외
 */
export async function getGuardianPhones(
  supabase: SupabaseClient,
  studentId: string
): Promise<GuardianContact[]> {
  const { data: guardianRows, error } = await supabase
    .from('student_guardians')
    .select(`
      guardians (
        id,
        name,
        phone,
        users (phone)
      )
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)

  if (error || !guardianRows) {
    return []
  }

  const contacts: GuardianContact[] = []

  for (const row of guardianRows) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guardian = (row as any).guardians
    if (!guardian) continue

    const phone = guardian.phone || guardian.users?.phone
    if (!phone) continue

    contacts.push({
      guardianId: guardian.id,
      name: guardian.name || '보호자',
      phone,
    })
  }

  return contacts
}

/**
 * 학생의 주 보호자(첫 번째) 연락처 조회
 */
export async function getPrimaryGuardianPhone(
  supabase: SupabaseClient,
  studentId: string
): Promise<GuardianContact | null> {
  const contacts = await getGuardianPhones(supabase, studentId)
  return contacts[0] ?? null
}
