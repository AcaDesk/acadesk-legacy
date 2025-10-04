# 자동 알림 및 리포트 발송 크론잡 설정 가이드

이 문서는 Acadesk 자동 알림 시스템 및 리포트 자동 발송을 위한 크론잡 설정 방법을 설명합니다.

## 개요

자동 알림 시스템은 다음 네 가지 자동화 작업을 수행합니다:

1. **미등원 알림** - 수업 시작 30분 후 결석 학생 보호자에게 알림
2. **과제 마감 알림** - 과제 마감 하루 전 학생에게 알림
3. **도서 반납 알림** - 매주 월요일 오전 이번 주 반납 예정 도서 알림
4. **월간 리포트 자동 발송** - 매월 1일 오전 9시 전월 리포트 자동 발송

## API 엔드포인트

### 알림 자동 전송

```
POST /api/notifications/auto-send
Content-Type: application/json

{
  "type": "absent_students" | "todo_reminders" | "book_return_reminders"
}
```

### 리포트 자동 발송

```
POST /api/reports/auto-send
Content-Type: application/json

{
  "year": 2025,     // Optional: defaults to current year
  "month": 10       // Optional: defaults to current month
}
```

## 설정 방법

### 1. Vercel Cron Jobs (권장)

Vercel에 배포된 경우, `vercel.json` 파일에 크론 설정을 추가합니다.

```json
{
  "crons": [
    {
      "path": "/api/notifications/auto-send",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**주의**: Vercel Cron Jobs는 Pro 플랜 이상에서만 사용 가능합니다.

### 2. GitHub Actions (무료 대안)

`.github/workflows/notifications.yml` 파일 생성:

```yaml
name: Auto Notifications

on:
  schedule:
    # 미등원 알림: 매 30분마다 실행
    - cron: '*/30 * * * *'
    # 과제 마감 알림: 매일 오후 8시 (KST 기준 11:00 UTC)
    - cron: '0 11 * * *'
    # 도서 반납 알림: 매주 월요일 오전 9시 (KST 기준 00:00 UTC)
    - cron: '0 0 * * 1'
    # 월간 리포트 발송: 매월 1일 오전 9시 (KST 기준 00:00 UTC)
    - cron: '0 0 1 * *'

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Send Absent Student Alerts
        if: github.event.schedule == '*/30 * * * *'
        run: |
          curl -X POST https://your-domain.com/api/notifications/auto-send \
            -H "Content-Type: application/json" \
            -d '{"type": "absent_students"}'

      - name: Send TODO Reminders
        if: github.event.schedule == '0 11 * * *'
        run: |
          curl -X POST https://your-domain.com/api/notifications/auto-send \
            -H "Content-Type: application/json" \
            -d '{"type": "todo_reminders"}'

      - name: Send Book Return Reminders
        if: github.event.schedule == '0 0 * * 1'
        run: |
          curl -X POST https://your-domain.com/api/notifications/auto-send \
            -H "Content-Type: application/json" \
            -d '{"type": "book_return_reminders"}'

      - name: Send Monthly Reports
        if: github.event.schedule == '0 0 1 * *'
        run: |
          curl -X POST https://your-domain.com/api/reports/auto-send \
            -H "Content-Type: application/json" \
            -d '{}'
```

### 3. 외부 크론 서비스

**EasyCron** 또는 **cron-job.org** 같은 무료 크론 서비스 사용:

#### 미등원 알림
- **URL**: `https://your-domain.com/api/notifications/auto-send`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: `{"type": "absent_students"}`
- **Schedule**: 매 30분마다 (`*/30 * * * *`)

#### 과제 마감 알림
- **URL**: `https://your-domain.com/api/notifications/auto-send`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: `{"type": "todo_reminders"}`
- **Schedule**: 매일 오후 8시 (`0 20 * * *`)

#### 도서 반납 알림
- **URL**: `https://your-domain.com/api/notifications/auto-send`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: `{"type": "book_return_reminders"}`
- **Schedule**: 매주 월요일 오전 9시 (`0 9 * * 1`)

#### 월간 리포트 자동 발송
- **URL**: `https://your-domain.com/api/reports/auto-send`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: `{}`
- **Schedule**: 매월 1일 오전 9시 (`0 9 1 * *`)

### 4. Self-hosted (Node.js)

서버에서 직접 크론잡을 실행하려면 `node-cron` 사용:

```bash
npm install node-cron
```

`scripts/cron-notifications.js` 파일 생성:

```javascript
const cron = require('node-cron')

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// 미등원 알림: 매 30분마다
cron.schedule('*/30 * * * *', async () => {
  console.log('Running absent student alerts...')
  try {
    const response = await fetch(`${API_URL}/api/notifications/auto-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'absent_students' })
    })
    const result = await response.json()
    console.log('Absent alerts:', result)
  } catch (error) {
    console.error('Error sending absent alerts:', error)
  }
})

// 과제 마감 알림: 매일 오후 8시
cron.schedule('0 20 * * *', async () => {
  console.log('Running TODO reminders...')
  try {
    const response = await fetch(`${API_URL}/api/notifications/auto-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'todo_reminders' })
    })
    const result = await response.json()
    console.log('TODO reminders:', result)
  } catch (error) {
    console.error('Error sending TODO reminders:', error)
  }
})

// 도서 반납 알림: 매주 월요일 오전 9시
cron.schedule('0 9 * * 1', async () => {
  console.log('Running book return reminders...')
  try {
    const response = await fetch(`${API_URL}/api/notifications/auto-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'book_return_reminders' })
    })
    const result = await response.json()
    console.log('Book return reminders:', result)
  } catch (error) {
    console.error('Error sending book return reminders:', error)
  }
})

// 월간 리포트 자동 발송: 매월 1일 오전 9시
cron.schedule('0 9 1 * *', async () => {
  console.log('Running monthly report auto-send...')
  try {
    const response = await fetch(`${API_URL}/api/reports/auto-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const result = await response.json()
    console.log('Monthly report auto-send:', result)
  } catch (error) {
    console.error('Error sending monthly reports:', error)
  }
})

console.log('Notification and report cron jobs started')
```

실행:
```bash
node scripts/cron-notifications.js
```

## 크론 표현식 설명

```
┌───────────── 분 (0 - 59)
│ ┌───────────── 시 (0 - 23)
│ │ ┌───────────── 일 (1 - 31)
│ │ │ ┌───────────── 월 (1 - 12)
│ │ │ │ ┌───────────── 요일 (0 - 6) (일요일=0)
│ │ │ │ │
* * * * *
```

**예시**:
- `*/30 * * * *` - 매 30분마다
- `0 20 * * *` - 매일 오후 8시
- `0 9 * * 1` - 매주 월요일 오전 9시
- `0 0 1 * *` - 매월 1일 자정

## 테스트

수동으로 알림을 테스트하려면:

```bash
# 미등원 알림 테스트
curl -X POST http://localhost:3000/api/notifications/auto-send \
  -H "Content-Type: application/json" \
  -d '{"type": "absent_students"}'

# 과제 마감 알림 테스트
curl -X POST http://localhost:3000/api/notifications/auto-send \
  -H "Content-Type: application/json" \
  -d '{"type": "todo_reminders"}'

# 도서 반납 알림 테스트
curl -X POST http://localhost:3000/api/notifications/auto-send \
  -H "Content-Type: application/json" \
  -d '{"type": "book_return_reminders"}'

# 월간 리포트 자동 발송 테스트
curl -X POST http://localhost:3000/api/reports/auto-send \
  -H "Content-Type: application/json" \
  -d '{}'
```

또는 알림 관리 페이지(`/notifications`)에서 "수동 실행" 또는 "즉시 발송" 버튼을 사용하세요.

## 모니터링

알림 전송 결과는 다음 위치에서 확인할 수 있습니다:

1. **알림 관리 페이지**: `/notifications` - 전송 기록과 통계 확인
2. **Supabase 데이터베이스**: `notification_logs` 테이블

## 보안

프로덕션 환경에서는 API 엔드포인트를 보호하기 위해 인증을 추가하는 것을 권장합니다:

```typescript
// src/app/api/notifications/auto-send/route.ts
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

환경 변수 설정:
```bash
CRON_SECRET=your-secret-key
```

크론잡 설정에 헤더 추가:
```bash
-H "Authorization: Bearer your-secret-key"
```

## 문제 해결

### 알림이 전송되지 않음
1. 크론잡이 올바르게 실행되고 있는지 확인
2. API 엔드포인트가 접근 가능한지 확인
3. Supabase 연결 상태 확인
4. `notification_logs` 테이블에서 에러 메시지 확인

### 중복 알림
1. 크론잡이 중복 실행되고 있지 않은지 확인
2. `reminder_sent_at` 필드가 올바르게 업데이트되는지 확인

### 시간대 문제
1. 서버 시간대와 크론 스케줄의 시간대가 일치하는지 확인
2. UTC와 KST 시차(+9시간)를 고려하여 크론 시간 조정
