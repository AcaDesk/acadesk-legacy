/**
 * 수동 이벤트 알림톡 발송 액션
 *
 * 학원장이 학생 상세/도메인 카드 등에서 명시적으로 "알림 보내기" 버튼을 눌렀을 때 사용.
 * 기존 fireEventAlimtalk 과 같은 인프라(이벤트 구독 + 솔라피 템플릿) 를 그대로 활용하므로
 * 학원장이 이벤트 알림 탭에서 **OFF 로 끈 이벤트는 수동에서도 발송 불가** — 자율성 일관성 유지.
 *
 * 자동 vs 수동 차이:
 *  - 자동(fire-and-forget): silent error, void 반환
 *  - 수동(이 액션): 결과 반환, UI 토스트로 사용자에게 알림
 */

'use server'

import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getGuardianPhones } from '@/lib/messaging/guardian-lookup'
import { sendEventAlimtalk } from '@/lib/messaging/event-alimtalk'

export interface SendEventAlimtalkActionResult {
  success: boolean
  sent: number
  total: number
  error: string | null
}

/**
 * 학생 한 명에 대해 이벤트 알림톡을 보호자들에게 발송 (수동, 결과 반환).
 *
 * @param studentId  발송 대상 학생
 * @param eventType  shared_alimtalk_templates.event_type
 * @param extraVariables  템플릿이 요구하는 추가 변수 (학원명/학생명/보호자명/학원연락처는 자동 채움)
 */
export async function sendEventAlimtalkAction(
  studentId: string,
  eventType: string,
  extraVariables?: Record<string, string>,
): Promise<SendEventAlimtalkActionResult> {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 보호자 조회
    const guardians = await getGuardianPhones(supabase, studentId, tenantId)
    if (guardians.length === 0) {
      return { success: false, sent: 0, total: 0, error: '연결된 보호자가 없습니다.' }
    }

    // 2. 학생/학원 기본 정보
    const [{ data: student }, { data: tenant }] = await Promise.all([
      supabase
        .from('students')
        .select('name, students_pii(name)')
        .eq('id', studentId)
        .maybeSingle(),
      supabase.from('tenants').select('name, phone').eq('id', tenantId).maybeSingle(),
    ])

    const piiData = student?.students_pii as
      | Array<{ name?: string }>
      | { name?: string }
      | null
    const piiName = Array.isArray(piiData) ? piiData[0]?.name : piiData?.name
    const studentName = piiName || student?.name || '학생'
    const academyName = tenant?.name || '학원'
    const academyPhone = tenant?.phone || ''

    // 3. 보호자별 발송 + 결과 집계
    let sent = 0
    let lastError: string | null = null
    for (const guardian of guardians) {
      const variables: Record<string, string> = {
        학원명: academyName,
        학원연락처: academyPhone,
        보호자명: guardian.name,
        학생명: studentName,
        ...extraVariables,
      }
      const result = await sendEventAlimtalk({
        tenantId,
        eventType,
        recipientPhone: guardian.phone,
        variables,
        studentId,
      })
      if (result.success) {
        sent++
      } else {
        lastError = result.error || lastError
      }
    }

    if (sent === 0) {
      // 한 건도 못 보냄 → 가장 흔한 사유는 이벤트 구독 OFF 또는 미승인.
      return {
        success: false,
        sent: 0,
        total: guardians.length,
        error: lastError || '발송할 수 없습니다. 알림 서비스 연동 > 이벤트 알림 탭에서 구독 상태를 확인해주세요.',
      }
    }

    return { success: true, sent, total: guardians.length, error: null }
  } catch (error) {
    console.error('[sendEventAlimtalkAction] Error:', error)
    return {
      success: false,
      sent: 0,
      total: 0,
      error: error instanceof Error ? error.message : '알림톡 발송 중 오류가 발생했습니다.',
    }
  }
}
