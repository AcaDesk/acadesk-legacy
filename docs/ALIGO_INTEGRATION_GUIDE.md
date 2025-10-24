# 알리고(Aligo) SMS API 통합 가이드

Acadesk Web에서 알리고 SMS API를 사용하여 실제 문자 발송을 구현하는 완전한 가이드입니다.

## 목차

- [왜 알리고인가?](#왜-알리고인가)
- [알리고 계정 설정](#알리고-계정-설정)
- [환경 변수 설정](#환경-변수-설정)
- [알리고 SMS Provider 구현](#알리고-sms-provider-구현)
- [이메일 발송 (Resend 권장)](#이메일-발송-resend-권장)
- [Server Action 통합](#server-action-통합)
- [테스트 방법](#테스트-방법)
- [요금 및 최적화](#요금-및-최적화)
- [문제 해결](#문제-해결)

---

## 왜 알리고인가?

### 장점

✅ **가성비 최고**
- SMS: 건당 9원
- LMS (장문): 건당 27원
- MMS (이미지): 건당 120원

✅ **간단한 API**
- REST API 제공
- 복잡한 인증 없음 (API Key + User ID)
- 한글 문서 완비

✅ **한국 특화**
- 080 수신거부 서비스 무료 제공
- 국내 통신사 최적화
- 발송 성공률 높음

✅ **기능 풍부**
- 예약 발송 지원
- 발송 내역 조회
- 잔액 조회 API

### 단점

⚠️ **해외 발송 불가**: 국내 전용 서비스
⚠️ **선불 충전**: 사용 전 충전 필요

---

## 알리고 계정 설정

### 1. 회원가입 및 인증

1. **알리고 홈페이지 접속**
   - https://smartsms.aligo.in/

2. **회원가입**
   - 무료 회원가입
   - 이메일 인증 완료

3. **발신번호 등록**
   - 좌측 메뉴: `발신번호 관리` > `발신번호 등록`
   - 개인: 휴대폰 인증
   - 사업자: 사업자등록증 업로드
   - 승인까지 약 1-2시간 소요

### 2. API Key 발급

1. **API Key 확인**
   - 좌측 메뉴: `API 연동` > `API Key 확인`
   - API Key 복사 (예: `abcd1234efgh5678...`)

2. **User ID 확인**
   - 로그인 ID가 User ID입니다
   - 예: `yourid`

### 3. 충전하기

1. **충전**
   - 좌측 메뉴: `충전/결제` > `충전하기`
   - 최소 충전: 5,000원
   - 테스트용: 10,000원 권장

2. **잔액 확인**
   - 대시보드에서 실시간 확인
   - API로도 확인 가능

---

## 환경 변수 설정

### `.env.local` (로컬 개발)

```bash
# 알리고 SMS API
ALIGO_API_KEY=your_api_key_here
ALIGO_USER_ID=your_user_id
ALIGO_SENDER=01012345678  # 등록된 발신번호
```

### `.env.production` (프로덕션)

```bash
# 프로덕션에서도 동일하게 설정
ALIGO_API_KEY=your_api_key_here
ALIGO_USER_ID=your_user_id
ALIGO_SENDER=01012345678
```

### Vercel 환경 변수 설정

```bash
# Vercel CLI로 설정
vercel env add ALIGO_API_KEY production
vercel env add ALIGO_USER_ID production
vercel env add ALIGO_SENDER production

# 또는 Vercel Dashboard에서 설정
# Project Settings > Environment Variables
```

---

## 알리고 SMS Provider 구현

### 1. 알리고 SMS 모듈 생성

**파일**: `/src/lib/messaging/aligo-sms.ts`

```typescript
/**
 * 알리고 SMS API 통합
 *
 * API 문서: https://smartsms.aligo.in/admin/api/spec.html
 */

interface AligoSendOptions {
  to: string[]           // 수신번호 배열
  message: string        // 메시지 내용
  subject?: string       // LMS 제목 (선택)
}

interface AligoResponse {
  result_code: string    // 성공: 1, 실패: 음수
  message: string        // 결과 메시지
  msg_id?: string        // 메시지 고유 ID
  success_cnt?: number   // 성공 건수
  error_cnt?: number     // 실패 건수
}

/**
 * 알리고 SMS 발송
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
```

### 2. 통합 Provider 생성

**파일**: `/src/lib/messaging/provider.ts`

```typescript
/**
 * 통합 메시지 발송 Provider
 *
 * SMS: 알리고
 * Email: Resend (또는 선택한 서비스)
 */

import { sendAligoSMS } from './aligo-sms'

export interface SendMessageOptions {
  type: 'sms' | 'email'
  to: string
  message: string
  subject?: string
}

/**
 * 통합 메시지 발송
 */
export async function sendMessage({
  type,
  to,
  message,
  subject,
}: SendMessageOptions): Promise<{
  success: boolean
  error?: string
}> {
  if (type === 'sms') {
    // SMS: 알리고 사용
    return await sendAligoSMS({
      to: [to],
      message,
      subject,
    })
  } else {
    // Email: Resend 또는 다른 서비스 사용
    // TODO: 이메일 발송 구현
    console.log('[sendMessage] Email sending not implemented yet')
    console.log(`Would send email to ${to}: ${message}`)

    return {
      success: true, // 임시로 성공 처리 (나중에 실제 구현)
    }
  }
}

/**
 * 잔액 확인 (모니터링용)
 */
export async function checkBalance() {
  const { getAligoBalance } = await import('./aligo-sms')
  return await getAligoBalance()
}
```

---

## 이메일 발송 (Resend 권장)

이메일은 **Resend**를 권장합니다 (무료 월 3,000통).

### Resend 설정

1. **가입**: https://resend.com
2. **API Key 생성**: Dashboard > API Keys
3. **도메인 등록**: Dashboard > Domains (선택사항)

### 환경 변수

```bash
# .env.local
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=no-reply@yourdomain.com
```

### Resend 모듈 구현

**파일**: `/src/lib/messaging/resend-email.ts`

```typescript
interface SendEmailOptions {
  to: string
  subject: string
  message: string
}

export async function sendResendEmail({
  to,
  subject,
  message,
}: SendEmailOptions): Promise<{
  success: boolean
  error?: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return {
      success: false,
      error: 'Resend API 인증 정보가 없습니다.',
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: `<p>${message}</p>`,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Email sending failed')
    }

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[sendResendEmail] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

### Provider 업데이트

```typescript
// /src/lib/messaging/provider.ts
import { sendResendEmail } from './resend-email'

export async function sendMessage({
  type,
  to,
  message,
  subject,
}: SendMessageOptions) {
  if (type === 'sms') {
    return await sendAligoSMS({ to: [to], message, subject })
  } else {
    return await sendResendEmail({
      to,
      subject: subject || '학원 알림',
      message,
    })
  }
}
```

---

## Server Action 통합

### `/src/app/actions/messages.ts` 수정

**Line 248-283 교체**:

```typescript
import { sendMessage } from '@/lib/messaging/provider'

// ...

for (const sg of guardians) {
  const guardian = sg.guardians as any
  const guardianUser = guardian?.users as { name: string; email: string; phone: string } | null
  if (!guardianUser) continue

  const recipientInfo =
    validated.type === 'email'
      ? guardianUser.email
      : guardianUser.phone

  if (!recipientInfo) {
    failCount++
    logs.push({
      tenant_id: tenantId,
      student_id: student.id,
      session_id: null,
      notification_type: validated.type,
      message: validated.message,
      subject: validated.type === 'email' ? validated.subject : null,
      status: 'failed',
      error_message: `보호자 ${validated.type === 'email' ? '이메일' : '전화번호'} 정보가 없습니다`,
      sent_at: new Date().toISOString(),
    })
    continue
  }

  try {
    // ✅ 실제 SMS/Email 발송
    const result = await sendMessage({
      type: validated.type,
      to: recipientInfo,
      message: validated.message,
      subject: validated.subject,
    })

    if (!result.success) {
      throw new Error(result.error || '발송 실패')
    }

    logs.push({
      tenant_id: tenantId,
      student_id: student.id,
      session_id: null,
      notification_type: validated.type,
      message: validated.message,
      subject: validated.type === 'email' ? validated.subject : null,
      status: 'sent',
      error_message: null,
      sent_at: new Date().toISOString(),
    })

    successCount++
  } catch (error) {
    failCount++
    logs.push({
      tenant_id: tenantId,
      student_id: student.id,
      session_id: null,
      notification_type: validated.type,
      message: validated.message,
      subject: validated.type === 'email' ? validated.subject : null,
      status: 'failed',
      error_message: getErrorMessage(error),
      sent_at: new Date().toISOString(),
    })
  }
}
```

**Line 436 (TODO 리마인더)도 동일하게 교체**:

```typescript
// 과제 알림 발송
if (studentUser?.phone) {
  const result = await sendMessage({
    type: 'sms',
    to: studentUser.phone,
    message,
  })

  await supabase.from('notification_logs').insert({
    tenant_id: tenantId,
    student_id: todo.student_id,
    session_id: null,
    notification_type: 'sms',
    message,
    subject: null,
    status: result.success ? 'sent' : 'failed',
    error_message: result.success ? null : result.error,
    sent_at: new Date().toISOString(),
  })
}
```

---

## 테스트 방법

### 1. 환경 변수 확인

```bash
# .env.local 확인
cat .env.local | grep ALIGO
```

### 2. 잔액 확인 테스트

**파일**: `/src/lib/messaging/__tests__/aligo.test.ts` (선택)

```typescript
import { getAligoBalance } from '../aligo-sms'

async function testBalance() {
  const result = await getAligoBalance()
  console.log('Balance:', result)
}

testBalance()
```

### 3. 실제 발송 테스트

1. **본인 번호로 테스트 학생 생성**
   - `/students` 페이지에서 테스트 학생 추가
   - 보호자 정보에 본인 번호 입력

2. **메시지 전송**
   - `/notifications` 페이지 접속
   - "메시지 전송" 버튼 클릭
   - 테스트 학생 선택
   - SMS 선택 후 테스트 메시지 작성
   - 전송

3. **로그 확인**
   ```sql
   SELECT * FROM notification_logs
   WHERE status = 'sent'
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

### 4. 에러 처리 테스트

잘못된 번호로 테스트:
- 수신번호: `01000000000`
- 발송 실패 확인
- `notification_logs`에 `error_message` 저장 확인

---

## 요금 및 최적화

### 요금표 (알리고)

| 타입 | 설명 | 가격 |
|------|------|------|
| SMS | 90자 이하 | 9원 |
| LMS | 2,000자 이하 | 27원 |
| MMS | 이미지 포함 | 120원 |

### 최적화 팁

1. **메시지 길이 관리**
   ```typescript
   // 90자 이하로 유지하여 SMS로 발송
   const message = `[학원명] ${studentName}님, 오늘 수업 잘 들었습니다!` // 30자
   ```

2. **발송 시간 제한**
   - 야간 발송 제한 (오후 9시 ~ 오전 8시)
   - 휴일 발송 제한 (선택)

3. **잔액 모니터링**
   ```typescript
   // Cron Job으로 매일 잔액 확인
   const { balance } = await getAligoBalance()
   if (balance < 1000) {
     // 관리자에게 알림
   }
   ```

4. **발송 실패 재시도**
   ```typescript
   // 실패 시 최대 3회 재시도
   let retries = 0
   while (retries < 3) {
     const result = await sendMessage(...)
     if (result.success) break
     retries++
     await delay(1000) // 1초 대기
   }
   ```

---

## 문제 해결

### 1. "인증 오류"

**원인**: API Key 또는 User ID 잘못됨

**해결**:
```bash
# .env.local 확인
echo $ALIGO_API_KEY
echo $ALIGO_USER_ID

# 알리고 사이트에서 재확인
# API 연동 > API Key 확인
```

### 2. "발신번호 미등록"

**원인**: 발신번호가 알리고에 등록되지 않음

**해결**:
1. 알리고 사이트 로그인
2. `발신번호 관리` > `발신번호 등록`
3. 휴대폰 인증 또는 사업자등록증 업로드
4. 승인 대기 (1-2시간)

### 3. "잔액 부족"

**원인**: 충전 금액 부족

**해결**:
1. 알리고 사이트 로그인
2. `충전/결제` > `충전하기`
3. 최소 5,000원 충전

### 4. "발송 실패 (result_code: -101)"

**원인**: 수신번호 형식 오류

**해결**:
```typescript
// 하이픈 제거 확인
const phone = '010-1234-5678'.replace(/-/g, '') // 01012345678
```

### 5. "테스트 모드 해제 안 됨"

**원인**: `testmode_yn: 'Y'` 설정됨

**해결**:
```typescript
// aligo-sms.ts에서 주석 처리 또는 제거
// testmode_yn: 'Y',  // ← 이 줄 제거
```

---

## 다음 단계

1. ✅ 알리고 계정 가입 및 설정
2. ✅ 발신번호 등록
3. ✅ 환경 변수 설정
4. ✅ Provider 코드 구현
5. ✅ Server Action 통합
6. ⏳ 테스트 발송
7. ⏳ 프로덕션 배포

---

## 참고 자료

- [알리고 API 문서](https://smartsms.aligo.in/admin/api/spec.html)
- [알리고 요금표](https://smartsms.aligo.in/admin/service/price.html)
- [발신번호 등록 가이드](https://smartsms.aligo.in/admin/sender/index.html)

---

## 지원

문제가 발생하면:
1. 알리고 고객센터: 1544-5678
2. 이메일: help@aligocsms.com
3. 카카오톡: @알리고
