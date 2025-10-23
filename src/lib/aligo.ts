/**
 * Aligo SMS/LMS API Integration
 *
 * 알리고 문자 발송 서비스 연동
 * @see https://smartsms.aligo.in/admin/api/spec.html
 */

interface AligoConfig {
  apiKey: string
  userId: string
  senderPhone: string
}

interface SendSmsParams {
  receiver: string // 수신번호 (여러 명일 경우 콤마로 구분)
  msg: string // 메시지 내용
  msgType?: 'SMS' | 'LMS' | 'MMS' // 메시지 타입 (기본: SMS)
  title?: string // LMS/MMS 제목
  testMode?: boolean // 테스트 모드 (실제 발송 안 함)
}

interface AligoSendResponse {
  result_code: string // 성공: '1', 실패: '-1' 등
  message: string // 결과 메시지
  msg_id?: string // 발송 성공 시 메시지 ID
  success_cnt?: number // 성공 건수
  error_cnt?: number // 실패 건수
  msg_type?: string // SMS/LMS/MMS
}

interface AligoListParams {
  page?: number // 페이지 번호 (기본: 1)
  pageSize?: number // 페이지당 건수 (기본: 30, 최대: 500)
  startDate?: string // 조회 시작일 (YYYYMMDD)
  endDate?: string // 조회 종료일 (YYYYMMDD)
  msgId?: string // 특정 메시지 ID 조회
}

interface AligoListResponse {
  result_code: string
  message: string
  list?: Array<{
    mid: string // 메시지 ID
    type: string // SMS/LMS/MMS
    sender: string // 발신번호
    receiver: string // 수신번호
    msg: string // 메시지 내용
    reserve_date: string // 예약일시
    sms_state: string // 전송상태 (0:대기, 1:성공, 2:실패)
    reg_date: string // 등록일시
  }>
  total_count?: number
}

/**
 * 알리고 설정 가져오기
 */
function getAligoConfig(): AligoConfig {
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const senderPhone = process.env.ALIGO_SENDER_PHONE

  if (!apiKey || !userId || !senderPhone) {
    throw new Error(
      'Aligo configuration missing. Please set ALIGO_API_KEY, ALIGO_USER_ID, and ALIGO_SENDER_PHONE in environment variables.'
    )
  }

  return {
    apiKey,
    userId,
    senderPhone,
  }
}

/**
 * SMS/LMS 발송
 *
 * @param params - 발송 파라미터
 * @returns 발송 결과
 */
export async function sendSms(params: SendSmsParams): Promise<AligoSendResponse> {
  try {
    const config = getAligoConfig()

    // 테스트 모드일 경우 실제 API 호출 없이 성공 응답 반환
    if (params.testMode || process.env.NODE_ENV === 'development') {
      console.log('[Aligo TEST MODE] SMS would be sent:', {
        sender: config.senderPhone,
        receiver: params.receiver,
        msg: params.msg,
        msgType: params.msgType || 'SMS',
      })

      return {
        result_code: '1',
        message: 'success (TEST MODE)',
        msg_id: `TEST_${Date.now()}`,
        success_cnt: 1,
        error_cnt: 0,
        msg_type: params.msgType || 'SMS',
      }
    }

    // 실제 API 호출
    const formData = new URLSearchParams({
      key: config.apiKey,
      user_id: config.userId,
      sender: config.senderPhone,
      receiver: params.receiver,
      msg: params.msg,
      msg_type: params.msgType || 'SMS',
      title: params.title || '',
      testmode_yn: 'N',
    })

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`Aligo API request failed: ${response.status} ${response.statusText}`)
    }

    const data: AligoSendResponse = await response.json()

    // 결과 코드 확인
    if (data.result_code !== '1') {
      throw new Error(`Aligo API error: ${data.message}`)
    }

    return data
  } catch (error) {
    console.error('[sendSms] Error:', error)
    throw error
  }
}

/**
 * 발송 내역 조회
 *
 * @param params - 조회 파라미터
 * @returns 발송 내역
 */
export async function getSmsList(params?: AligoListParams): Promise<AligoListResponse> {
  try {
    const config = getAligoConfig()

    const formData = new URLSearchParams({
      key: config.apiKey,
      user_id: config.userId,
      page: (params?.page || 1).toString(),
      page_size: (params?.pageSize || 30).toString(),
    })

    if (params?.startDate) {
      formData.append('start_date', params.startDate)
    }

    if (params?.endDate) {
      formData.append('end_date', params.endDate)
    }

    if (params?.msgId) {
      formData.append('mid', params.msgId)
    }

    const response = await fetch('https://apis.aligo.in/list/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      throw new Error(`Aligo API request failed: ${response.status} ${response.statusText}`)
    }

    const data: AligoListResponse = await response.json()

    if (data.result_code !== '1') {
      throw new Error(`Aligo API error: ${data.message}`)
    }

    return data
  } catch (error) {
    console.error('[getSmsList] Error:', error)
    throw error
  }
}

/**
 * 발송 상태 조회 (특정 메시지 ID)
 *
 * @param msgId - 메시지 ID
 * @returns 발송 상태
 */
export async function getSmsStatus(msgId: string): Promise<{
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  message: string
}> {
  try {
    const result = await getSmsList({ msgId })

    if (!result.list || result.list.length === 0) {
      return {
        status: 'failed',
        message: '메시지를 찾을 수 없습니다',
      }
    }

    const sms = result.list[0]

    // sms_state: 0=대기, 1=성공, 2=실패
    switch (sms.sms_state) {
      case '0':
        return { status: 'pending', message: '발송 대기 중' }
      case '1':
        return { status: 'delivered', message: '전송 성공' }
      case '2':
        return { status: 'failed', message: '전송 실패' }
      default:
        return { status: 'pending', message: '알 수 없는 상태' }
    }
  } catch (error) {
    console.error('[getSmsStatus] Error:', error)
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : '상태 조회 실패',
    }
  }
}

/**
 * 발신번호 형식 검증
 *
 * @param phone - 전화번호
 * @returns 유효 여부
 */
export function validatePhoneNumber(phone: string): boolean {
  // 한국 전화번호 형식: 010-0000-0000, 02-000-0000 등
  const phoneRegex = /^(01[016789]{1}|02|0[3-9]{1}[0-9]{1})-?[0-9]{3,4}-?[0-9]{4}$/
  return phoneRegex.test(phone)
}

/**
 * 전화번호 형식 정리 (하이픈 제거)
 *
 * @param phone - 전화번호
 * @returns 정리된 전화번호
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}
