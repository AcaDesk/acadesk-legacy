/**
 * 알리고 SMS API 통합
 *
 * API 문서: https://smartsms.aligo.in/admin/api/spec.html
 *
 * 사용법:
 * 1. 알리고 계정 가입 및 발신번호 등록
 * 2. 환경 변수 설정:
 *    - ALIGO_API_KEY
 *    - ALIGO_USER_ID
 *    - ALIGO_SENDER
 * 3. sendAligoSMS() 함수 호출
 */

interface AligoSendOptions {
  to: string[] // 수신번호 배열
  message: string // 메시지 내용
  subject?: string // LMS 제목 (선택)
}

interface AligoResponse {
  result_code: string // 성공: 1, 실패: 음수
  message: string // 결과 메시지
  msg_id?: string // 메시지 고유 ID
  success_cnt?: number // 성공 건수
  error_cnt?: number // 실패 건수
}

/**
 * 알리고 SMS 발송
 *
 * @param options.to - 수신번호 배열 (하이픈 포함 가능)
 * @param options.message - 메시지 내용 (90자 이하: SMS, 초과: LMS)
 * @param options.subject - LMS 제목 (선택)
 * @returns 발송 결과
 *
 * @example
 * ```typescript
 * const result = await sendAligoSMS({
 *   to: ['010-1234-5678', '010-9876-5432'],
 *   message: '안녕하세요, 테스트 메시지입니다.',
 * })
 *
 * if (result.success) {
 *   console.log('발송 성공:', result.data)
 * } else {
 *   console.error('발송 실패:', result.error)
 * }
 * ```
 */
export async function sendAligoSMS({
  to,
  message,
  subject,
}: AligoSendOptions): Promise<{
  success: boolean
  data?: AligoResponse
  error?: string
}> {
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER

  // 환경 변수 검증
  if (!apiKey || !userId || !sender) {
    console.error('[sendAligoSMS] Missing credentials:', {
      hasApiKey: !!apiKey,
      hasUserId: !!userId,
      hasSender: !!sender,
    })
    return {
      success: false,
      error: '알리고 API 인증 정보가 설정되지 않았습니다. 환경 변수를 확인하세요.',
    }
  }

  // 수신번호 포맷팅 (하이픈 제거)
  const formattedReceivers = to.map((phone) => phone.replace(/-/g, '')).join(',')

  // 메시지 타입 결정 (90자 이하: SMS, 초과: LMS)
  const msgType = message.length <= 90 ? 'SMS' : 'LMS'

  // Form data 생성
  const formData = new URLSearchParams({
    key: apiKey,
    user_id: userId,
    sender: sender.replace(/-/g, ''),
    receiver: formattedReceivers,
    msg: message,
    msg_type: msgType,
    title: subject || '', // LMS 제목 (선택)
    // testmode_yn: 'Y', // 테스트 모드 (실제 발송 안 됨, 개발 시 사용)
  })

  try {
    console.log('[sendAligoSMS] Sending SMS:', {
      msgType,
      receiverCount: to.length,
      messageLength: message.length,
    })

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: AligoResponse = await response.json()

    console.log('[sendAligoSMS] Response:', result)

    // 성공 여부 판단 (result_code가 1이면 성공)
    if (result.result_code === '1') {
      return {
        success: true,
        data: result,
      }
    } else {
      return {
        success: false,
        error: result.message || '알리고 SMS 발송 실패',
      }
    }
  } catch (error: any) {
    console.error('[sendAligoSMS] Error:', error)
    return {
      success: false,
      error: error.message || 'SMS 발송 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 알리고 잔액 조회
 *
 * 잔액이 부족할 때 알림을 보내거나 모니터링에 사용합니다.
 *
 * @returns 잔액 정보 (SMS 건수)
 *
 * @example
 * ```typescript
 * const result = await getAligoBalance()
 * if (result.success) {
 *   console.log('현재 잔액:', result.balance, '건')
 *   if (result.balance < 1000) {
 *     // 관리자에게 충전 알림
 *   }
 * }
 * ```
 */
export async function getAligoBalance(): Promise<{
  success: boolean
  balance?: number
  error?: string
}> {
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID

  if (!apiKey || !userId) {
    return {
      success: false,
      error: '알리고 API 인증 정보가 없습니다.',
    }
  }

  try {
    const formData = new URLSearchParams({
      key: apiKey,
      user_id: userId,
    })

    const response = await fetch('https://apis.aligo.in/remain/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const result = await response.json()

    if (result.result_code === '1') {
      return {
        success: true,
        balance: parseInt(result.SMS_CNT || '0', 10),
      }
    } else {
      return {
        success: false,
        error: result.message,
      }
    }
  } catch (error: any) {
    console.error('[getAligoBalance] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
