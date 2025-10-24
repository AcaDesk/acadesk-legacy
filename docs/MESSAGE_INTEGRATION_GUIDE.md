# 메시지 발송 시스템 통합 가이드

이 가이드는 Acadesk Web에서 실제 SMS 및 이메일 발송 기능을 구현하기 위한 가이드입니다.

## 목차

- [개요](#개요)
- [SMS 발송 통합](#sms-발송-통합)
  - [옵션 1: NHN Cloud SMS](#옵션-1-nhn-cloud-sms)
  - [옵션 2: Twilio](#옵션-2-twilio)
  - [옵션 3: SENS (Naver Cloud Platform)](#옵션-3-sens-naver-cloud-platform)
- [이메일 발송 통합](#이메일-발송-통합)
  - [옵션 1: Supabase Edge Functions](#옵션-1-supabase-edge-functions)
  - [옵션 2: SendGrid](#옵션-2-sendgrid)
  - [옵션 3: AWS SES](#옵션-3-aws-ses)
- [환경 변수 설정](#환경-변수-설정)
- [구현 예제](#구현-예제)
- [테스트 방법](#테스트-방법)

---

## 개요

현재 메시지 시스템은 UI와 데이터베이스 로직이 완성되어 있으나, 실제 SMS/이메일 발송은 통합이 필요합니다.

**구현 위치**:
- `/src/app/actions/messages.ts` - 메시지 전송 Server Actions
- Line 251: SMS/Email 발송 로직 (TODO)
- Line 357: 리포트 이메일 발송 (TODO)
- Line 436: 과제 SMS 알림 발송 (TODO)

---

## SMS 발송 통합

### 옵션 1: NHN Cloud SMS (추천 - 한국)

**장점**:
- 한국 통신사 최적화
- 합리적인 가격 (건당 약 9~15원)
- 080 수신거부 서비스 제공
- 한글 문서 및 지원

**가입**:
1. https://www.nhncloud.com 회원가입
2. SMS 서비스 활성화
3. 발신번호 등록 (사업자등록증 필요)
4. AppKey 및 Secret Key 발급

**설치**:
```bash
pnpm add axios
```

**환경 변수** (`.env.local`, `.env.production`):
```bash
# NHN Cloud SMS
NHN_SMS_APP_KEY=your_app_key
NHN_SMS_SECRET_KEY=your_secret_key
NHN_SMS_SENDER=01012345678  # 등록된 발신번호
```

**구현 예제** (`/src/lib/messaging/nhn-sms.ts`):
```typescript
import axios from 'axios'

interface SendSMSOptions {
  to: string[]
  message: string
}

export async function sendNhnSMS({ to, message }: SendSMSOptions) {
  const appKey = process.env.NHN_SMS_APP_KEY
  const secretKey = process.env.NHN_SMS_SECRET_KEY
  const sender = process.env.NHN_SMS_SENDER

  if (!appKey || !secretKey || !sender) {
    throw new Error('NHN SMS credentials not configured')
  }

  const url = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${appKey}/sender/sms`

  const body = {
    body: message,
    sendNo: sender,
    recipientList: to.map((phone) => ({
      recipientNo: phone,
      internationalRecipientNo: phone,
    })),
  }

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Secret-Key': secretKey,
      },
    })

    if (response.data.header.isSuccessful) {
      return {
        success: true,
        data: response.data.body,
      }
    } else {
      throw new Error(response.data.header.resultMessage)
    }
  } catch (error: any) {
    console.error('[sendNhnSMS] Error:', error)
    return {
      success: false,
      error: error.message || 'SMS 발송 실패',
    }
  }
}
```

**Server Action 통합** (`/src/app/actions/messages.ts:251`):
```typescript
import { sendNhnSMS } from '@/lib/messaging/nhn-sms'

// Line 250-265 교체:
try {
  // 실제 SMS/Email 발송
  if (validated.type === 'sms') {
    await sendNhnSMS({
      to: [recipientInfo],
      message: validated.message,
    })
  } else {
    // 이메일은 아래 섹션 참고
    await sendEmail({
      to: recipientInfo,
      subject: validated.subject || '학원 알림',
      message: validated.message,
    })
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
```

---

### 옵션 2: Twilio

**장점**:
- 글로벌 서비스 (190개국 이상)
- 풍부한 API 및 문서
- 무료 크레딧 제공

**가입**:
1. https://www.twilio.com/try-twilio
2. Phone Number 구매 (한국: +82)
3. Account SID 및 Auth Token 확인

**설치**:
```bash
pnpm add twilio
```

**환경 변수**:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+821012345678
```

**구현 예제** (`/src/lib/messaging/twilio-sms.ts`):
```typescript
import twilio from 'twilio'

export async function sendTwilioSMS(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured')
  }

  const client = twilio(accountSid, authToken)

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })

    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    console.error('[sendTwilioSMS] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

---

### 옵션 3: SENS (Naver Cloud Platform)

**장점**:
- 네이버 클라우드 플랫폼 연동
- 한국 시장 특화
- 대량 발송에 유리

**가입**:
1. https://www.ncloud.com
2. Simple & Easy Notification Service (SENS) 활성화
3. 발신번호 등록
4. Access Key 및 Secret Key 발급

**환경 변수**:
```bash
NAVER_SENS_ACCESS_KEY=your_access_key
NAVER_SENS_SECRET_KEY=your_secret_key
NAVER_SENS_SERVICE_ID=your_service_id
NAVER_SENS_SENDER=01012345678
```

**구현 예제** (`/src/lib/messaging/naver-sens.ts`):
```typescript
import axios from 'axios'
import crypto from 'crypto'

export async function sendNaverSMS(to: string, message: string) {
  const accessKey = process.env.NAVER_SENS_ACCESS_KEY!
  const secretKey = process.env.NAVER_SENS_SECRET_KEY!
  const serviceId = process.env.NAVER_SENS_SERVICE_ID!
  const sender = process.env.NAVER_SENS_SENDER!

  const timestamp = Date.now().toString()
  const method = 'POST'
  const space = ' '
  const newLine = '\n'
  const url = `/sms/v2/services/${serviceId}/messages`

  const hmac = crypto.createHmac('sha256', secretKey)
  hmac.update(method + space + url + newLine + timestamp + newLine + accessKey)
  const signature = hmac.digest('base64')

  try {
    const response = await axios.post(
      `https://sens.apigw.ntruss.com${url}`,
      {
        type: 'SMS',
        contentType: 'COMM',
        countryCode: '82',
        from: sender,
        content: message,
        messages: [{ to }],
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': accessKey,
          'x-ncp-apigw-signature-v2': signature,
        },
      }
    )

    return {
      success: true,
      data: response.data,
    }
  } catch (error: any) {
    console.error('[sendNaverSMS] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

---

## 이메일 발송 통합

### 옵션 1: Supabase Edge Functions (추천)

**장점**:
- Supabase 네이티브 통합
- 무료 티어 (월 500K requests)
- Deno 기반 (TypeScript)

**설치 및 배포**:
```bash
# Supabase CLI 설치 (이미 설치되어 있음)
npx supabase functions new send-email

# Edge Function 작성
# supabase/functions/send-email/index.ts
```

**Edge Function 예제** (`supabase/functions/send-email/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json()

    // Resend API로 이메일 발송
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Acadesk <no-reply@yourdomain.com>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to send email')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**배포**:
```bash
supabase functions deploy send-email --no-verify-jwt

# Secret 설정
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

**Server Action에서 호출**:
```typescript
export async function sendEmail({
  to,
  subject,
  message,
}: {
  to: string
  subject: string
  message: string
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      to,
      subject,
      html: `<p>${message}</p>`,
    }),
  })

  if (!response.ok) {
    throw new Error('Email sending failed')
  }

  return await response.json()
}
```

---

### 옵션 2: SendGrid

**장점**:
- 하루 100통 무료
- 전문적인 이메일 서비스
- 좋은 전달률 (Deliverability)

**가입**:
1. https://sendgrid.com/
2. API Key 생성
3. Sender Identity 등록

**설치**:
```bash
pnpm add @sendgrid/mail
```

**환경 변수**:
```bash
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=no-reply@yourdomain.com
```

**구현 예제** (`/src/lib/messaging/sendgrid.ts`):
```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendSendGridEmail({
  to,
  subject,
  message,
}: {
  to: string
  subject: string
  message: string
}) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject,
    text: message,
    html: `<p>${message}</p>`,
  }

  try {
    await sgMail.send(msg)
    return { success: true }
  } catch (error: any) {
    console.error('[sendSendGridEmail] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

---

### 옵션 3: AWS SES

**장점**:
- 매우 저렴 (1000통당 $0.10)
- 높은 확장성
- AWS 생태계 통합

**설치**:
```bash
pnpm add @aws-sdk/client-ses
```

**환경 변수**:
```bash
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SES_FROM_EMAIL=no-reply@yourdomain.com
```

**구현 예제** (`/src/lib/messaging/aws-ses.ts`):
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function sendAWSSES({
  to,
  subject,
  message,
}: {
  to: string
  subject: string
  message: string
}) {
  const command = new SendEmailCommand({
    Source: process.env.AWS_SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: message,
          Charset: 'UTF-8',
        },
        Html: {
          Data: `<p>${message}</p>`,
          Charset: 'UTF-8',
        },
      },
    },
  })

  try {
    const response = await ses.send(command)
    return {
      success: true,
      data: response,
    }
  } catch (error: any) {
    console.error('[sendAWSSES] Error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

---

## 환경 변수 설정

### 로컬 개발 (`.env.local`)

```bash
# SMS Provider (choose one)
# NHN Cloud
NHN_SMS_APP_KEY=your_app_key
NHN_SMS_SECRET_KEY=your_secret_key
NHN_SMS_SENDER=01012345678

# Email Provider (choose one)
# SendGrid
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=no-reply@yourdomain.com

# OR Resend (for Supabase Edge Functions)
RESEND_API_KEY=your_resend_api_key
```

### Staging/Production (`.env.production`)

**Vercel 환경 변수 설정**:
```bash
vercel env add NHN_SMS_APP_KEY production
vercel env add NHN_SMS_SECRET_KEY production
vercel env add NHN_SMS_SENDER production
vercel env add SENDGRID_API_KEY production
vercel env add SENDGRID_FROM_EMAIL production
```

**Supabase Edge Function Secrets**:
```bash
supabase secrets set RESEND_API_KEY=your_key --project-ref your-project-ref
```

---

## 구현 예제

### 통합 메시지 Provider (`/src/lib/messaging/provider.ts`)

```typescript
import { sendNhnSMS } from './nhn-sms'
import { sendSendGridEmail } from './sendgrid'

export interface SendMessageOptions {
  type: 'sms' | 'email'
  to: string
  message: string
  subject?: string
}

export async function sendMessage({ type, to, message, subject }: SendMessageOptions) {
  if (type === 'sms') {
    return await sendNhnSMS({ to: [to], message })
  } else {
    return await sendSendGridEmail({
      to,
      subject: subject || '학원 알림',
      message,
    })
  }
}
```

### Server Action 통합 (`/src/app/actions/messages.ts`)

**Line 250-280 교체**:
```typescript
import { sendMessage } from '@/lib/messaging/provider'

try {
  // 실제 SMS/Email 발송
  await sendMessage({
    type: validated.type,
    to: recipientInfo,
    message: validated.message,
    subject: validated.subject,
  })

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
```

---

## 테스트 방법

### 1. 로컬 테스트

```typescript
// /src/lib/messaging/__tests__/provider.test.ts
import { sendMessage } from '../provider'

describe('Message Provider', () => {
  it('should send SMS', async () => {
    const result = await sendMessage({
      type: 'sms',
      to: '01012345678',
      message: '테스트 메시지',
    })

    expect(result.success).toBe(true)
  })

  it('should send email', async () => {
    const result = await sendMessage({
      type: 'email',
      to: 'test@example.com',
      subject: '테스트',
      message: '테스트 이메일',
    })

    expect(result.success).toBe(true)
  })
})
```

### 2. 수동 테스트

1. `/notifications` 페이지 접속
2. "메시지 전송" 버튼 클릭
3. 본인 전화번호/이메일로 테스트 학생 생성
4. 테스트 메시지 전송
5. `notification_logs` 테이블에서 로그 확인:

```sql
SELECT * FROM notification_logs
ORDER BY sent_at DESC
LIMIT 10;
```

### 3. 에러 처리 확인

```typescript
// 발송 실패 시 로그 확인
const { data: failedLogs } = await supabase
  .from('notification_logs')
  .select('*')
  .eq('status', 'failed')
  .order('sent_at', { ascending: false })

console.log('Failed logs:', failedLogs)
```

---

## 권장 사항

### SMS Provider 선택 기준

- **한국 학원 전용**: NHN Cloud SMS (가성비 최고)
- **글로벌 확장 계획**: Twilio
- **네이버 생태계 활용**: SENS

### Email Provider 선택 기준

- **무료 시작**: SendGrid (하루 100통)
- **Supabase 통합**: Resend + Edge Functions
- **대량 발송**: AWS SES (가장 저렴)

### 보안 고려사항

1. **환경 변수 암호화**: Vercel/Supabase Secrets 사용
2. **Rate Limiting**: 스팸 방지를 위한 발송 제한
3. **수신 거부**: 080 번호 등록 (법적 요구사항)
4. **개인정보 보호**: 로그에 민감정보 저장 금지

---

## 다음 단계

1. ✅ 마이그레이션 적용 완료
2. ✅ UI 및 Server Actions 구현 완료
3. ⏳ **SMS/Email Provider 선택 및 통합** ← 현재 단계
4. ⏳ 환경 변수 설정
5. ⏳ 테스트 및 배포

---

## 참고 자료

- [NHN Cloud SMS 문서](https://docs.nhncloud.com/ko/Notification/SMS/ko/api-guide/)
- [Twilio SMS 문서](https://www.twilio.com/docs/sms)
- [SendGrid 문서](https://docs.sendgrid.com/)
- [AWS SES 문서](https://docs.aws.amazon.com/ses/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
