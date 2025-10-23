# 성적 리포트 자동화 시스템 구현 완료

> **완성도**: Phase 1-3 완료 (백엔드 완성) | Phase 4-5 남음 (UI 및 테스트)

## ✅ 구현 완료 항목

### 1. 메시지 전송 인프라

**Domain Layer**
- `IMessageProvider` 인터페이스 - 메시지 전송 추상화
- `MessageChannel` enum (SMS, LMS, KAKAO, EMAIL, PUSH)
- 확장 가능한 Provider 패턴

**Infrastructure Layer**
- `AligoProvider` - 알리고 SMS/LMS 전송
- `MessageProviderFactory` - Provider 관리 (싱글톤)
- 환경변수 검증 (ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER_PHONE)

### 2. 리포트 생성 및 PDF

**Domain Layer**
- `Report` 엔티티 - 리포트 비즈니스 로직
  - `toSMSMessage()` - SMS 형식 (90자)
  - `toLMSMessage()` - LMS 형식 (2000자)
  - `toKakaoVariables()` - 카카오톡 템플릿 변수
  - `toEmailHTML()` - 이메일 HTML (추후)
- `IReportRepository` 인터페이스
- `IMessageLogRepository` 인터페이스

**Infrastructure Layer**
- `ReportRepository` - Supabase 기반 리포트 저장소
- `MessageLogRepository` - 메시지 전송 이력 저장소
- `ReportPDFTemplate` - React 기반 PDF 템플릿 (@react-pdf/renderer)
- `PDFGenerator` - PDF 생성 유틸리티

### 3. Use Cases (Application Layer)

**GenerateStudentReportUseCase**
- 학생 정보, 성적, 출석, TODO, 상담 데이터 수집
- KPI 자동 계산 (평균 성적, 출석률, 숙제 완료율)
- Report 엔티티 생성 및 저장

**SendReportUseCase**
- 채널별 메시지 컨텐츠 생성
- MessageProvider를 통한 전송
- 전송 이력 자동 저장 (성공/실패)

### 4. Server Actions

**`src/app/actions/reports.ts`**
```typescript
// 리포트 생성
generateStudentReport({ studentId, startDate, endDate, type, comment })

// 리포트 전송
sendReport({ reportId, channel, recipientName, recipientContact })

// 원스톱 생성 + 전송
generateAndSendReport({ ...generate, ...send })

// 조회
getStudentReports(studentId)
getMessageLogs(studentId?, limit?)
```

### 5. 데이터베이스 (Supabase)

**reports 테이블**
- `id`, `tenant_id`, `type`, `student_id`, `class_id`
- `data` (jsonb) - ReportData (성적, 출석, TODO 등)
- `generated_by`, `created_at`, `deleted_at`
- RLS: READ 전용 (tenant_id 격리)

**message_logs 테이블**
- `id`, `tenant_id`, `channel`, `provider`
- `recipient_name`, `recipient_contact`
- `message_body`, `message_id`, `status`, `cost`
- `metadata` (jsonb) - studentId, reportId, senderId
- `sent_at`, `delivered_at`, `failed_at`
- RLS: READ 전용 (tenant_id 격리)

---

## 🎯 사용 방법

### 1. 환경변수 설정

```bash
# .env.local
ALIGO_API_KEY=your_api_key
ALIGO_USER_ID=your_user_id
ALIGO_SENDER_PHONE=01012345678  # 사전 등록된 발신번호
```

### 2. 리포트 생성 예시

```typescript
import { generateStudentReport } from '@/app/actions/reports'

const result = await generateStudentReport({
  studentId: 'student-uuid',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  type: 'student_monthly',
  comment: '이번 달 학습 태도가 매우 좋았습니다.',
})

// result.data.reportId
```

### 3. 리포트 전송 예시

```typescript
import { sendReport } from '@/app/actions/reports'

const result = await sendReport({
  reportId: 'report-uuid',
  channel: 'lms', // sms, lms, kakao, email
  recipientName: '김철수 학부모',
  recipientContact: '01012345678',
  academyName: '우리 학원',
  academyPhone: '02-1234-5678',
})

// result.data.messageId
// result.data.cost (원 단위)
```

### 4. 원스톱 생성 + 전송

```typescript
import { generateAndSendReport } from '@/app/actions/reports'

const result = await generateAndSendReport({
  // 리포트 생성
  studentId: 'student-uuid',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  type: 'student_monthly',
  comment: '종합 평가...',

  // 메시지 전송
  channel: 'lms',
  recipientName: '김철수 학부모',
  recipientContact: '01012345678',
  academyName: '우리 학원',
  academyPhone: '02-1234-5678',
})
```

---

## 📊 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation Layer                         │
│  - Server Actions (reports.ts)                               │
│  - API Routes (추후)                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  - GenerateStudentReportUseCase                              │
│  - SendReportUseCase                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  - Report Entity                                             │
│  - IMessageProvider (SMS/LMS/카카오톡/이메일 추상화)        │
│  - IReportRepository                                         │
│  - IMessageLogRepository                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  - AligoProvider (SMS/LMS 구현)                              │
│  - ReportRepository (Supabase)                               │
│  - MessageLogRepository (Supabase)                           │
│  - PDFGenerator (@react-pdf/renderer)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔮 확장 가능성

### 카카오톡 알림톡 추가

```typescript
// 1. KakaoProvider 구현
export class KakaoProvider implements IMessageProvider {
  readonly channel = MessageChannel.KAKAO
  readonly name = 'KakaoTalk'

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 카카오 비즈메시지 API 호출
  }
}

// 2. Factory에 등록
const kakaoProvider = new KakaoProvider()
this.providers.set(MessageChannel.KAKAO, kakaoProvider)
```

### 이메일 전송 추가

```typescript
// 1. EmailProvider 구현 (Resend 사용)
export class EmailProvider implements IMessageProvider {
  readonly channel = MessageChannel.EMAIL
  readonly name = 'Email (Resend)'

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    // Resend API 호출
  }
}

// 2. Factory에 등록
const emailProvider = new EmailProvider()
this.providers.set(MessageChannel.EMAIL, emailProvider)
```

---

## 🚧 남은 작업 (Phase 4-5)

### Phase 4: UI 통합
- [ ] 학생 상세 페이지에 "리포트 발송" 버튼
- [ ] 클래스 관리 페이지에 일괄 발송 UI
- [ ] 발송 이력 조회 페이지
- [ ] PDF 미리보기 다이얼로그

### Phase 5: 테스트 및 배포
- [ ] 알리고 테스트 모드로 전송 테스트
- [ ] PDF 생성 및 디자인 검증
- [ ] 단위 테스트 작성
- [ ] 프로덕션 배포

---

## 📝 참고 문서

- **설계 문서**: `docs/REPORT_AUTOMATION_DESIGN.md`
- **알리고 API**: https://smartsms.aligo.in/admin/api/spec.html
- **@react-pdf/renderer**: https://react-pdf.org/

---

**작성일**: 2025-10-23
**작성자**: Claude Code
**상태**: 백엔드 구현 완료, UI 개발 대기
