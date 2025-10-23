# 성적 리포트 자동화 및 메시지 전송 시스템 설계

## 📋 목차

1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [메시지 전송 인터페이스](#메시지-전송-인터페이스)
4. [알리고 API 통합](#알리고-api-통합)
5. [리포트 생성 로직](#리포트-생성-로직)
6. [확장 가능성](#확장-가능성)
7. [구현 계획](#구현-계획)

---

## 개요

### 목표
- 학생 성적 리포트 자동 생성 및 전송
- 알리고 API를 통한 SMS/LMS 문자 전송
- 카카오톡, 이메일 등 다른 채널로 확장 가능한 구조

### 주요 기능
1. **리포트 생성**: 학생별, 클래스별, 기간별 성적 리포트
2. **메시지 전송**: 알리고 API를 통한 문자 발송
3. **전송 이력**: 발송 내역 추적 및 실패 재시도
4. **템플릿 관리**: 리포트 템플릿 커스터마이징

---

## 아키텍처

### Clean Architecture 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │  Server Actions    │  │  API Routes (Webhooks)       │   │
│  │  - sendReport      │  │  - /api/aligo/callback       │   │
│  │  - scheduleReport  │  │                              │   │
│  └────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Use Cases                                         │     │
│  │  - GenerateStudentReportUseCase                    │     │
│  │  - SendReportUseCase                               │     │
│  │  - ScheduleReportUseCase                           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │  Entities          │  │  Interfaces                  │   │
│  │  - Report          │  │  - IMessageProvider          │   │
│  │  - MessageLog      │  │  - IReportRepository         │   │
│  └────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  ┌────────────────────┐  ┌─────────────────────────────┐   │
│  │  Message Providers │  │  Repositories                │   │
│  │  - AligoProvider   │  │  - ReportRepository          │   │
│  │  - KakaoProvider   │  │  - MessageLogRepository      │   │
│  │  - EmailProvider   │  │                              │   │
│  └────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 메시지 전송 인터페이스

### IMessageProvider (Domain Interface)

```typescript
// src/domain/messaging/IMessageProvider.ts
export enum MessageChannel {
  SMS = 'sms',        // 단문 문자 (90자 이내)
  LMS = 'lms',        // 장문 문자 (2000자 이내)
  KAKAO = 'kakao',    // 카카오톡 알림톡/친구톡
  EMAIL = 'email',    // 이메일
  PUSH = 'push',      // 푸시 알림
}

export interface MessageRecipient {
  name: string
  phone?: string      // SMS/LMS/KAKAO
  email?: string      // EMAIL
  userId?: string     // PUSH
}

export interface MessageContent {
  subject?: string    // 제목 (LMS, EMAIL)
  body: string        // 본문
  templateId?: string // 템플릿 ID (KAKAO)
  variables?: Record<string, string> // 템플릿 변수
  attachments?: Array<{
    filename: string
    url: string
  }>
}

export interface SendMessageRequest {
  channel: MessageChannel
  recipient: MessageRecipient
  content: MessageContent
  metadata?: {
    tenantId: string
    studentId?: string
    reportId?: string
    senderId?: string
  }
}

export interface SendMessageResponse {
  success: boolean
  messageId?: string  // 발송 ID (추적용)
  error?: string
  cost?: number       // 발송 비용 (크레딧)
  estimatedDelivery?: Date
}

export interface IMessageProvider {
  readonly channel: MessageChannel
  readonly name: string

  send(request: SendMessageRequest): Promise<SendMessageResponse>
  checkBalance(): Promise<{ balance: number; currency: string }>
  getDeliveryStatus(messageId: string): Promise<{
    status: 'pending' | 'sent' | 'delivered' | 'failed'
    deliveredAt?: Date
    failureReason?: string
  }>
}
```

---

## 알리고 API 통합

### 환경변수 설정

```bash
# .env.local
ALIGO_API_KEY=your_api_key
ALIGO_USER_ID=your_user_id
ALIGO_SENDER_PHONE=01012345678  # 발신번호 (사전 등록 필요)
```

### AligoProvider 구현

```typescript
// src/infrastructure/messaging/AligoProvider.ts
import { IMessageProvider, MessageChannel, SendMessageRequest, SendMessageResponse } from '@/domain/messaging/IMessageProvider'

export class AligoProvider implements IMessageProvider {
  readonly channel = MessageChannel.SMS
  readonly name = 'Aligo'

  private apiKey: string
  private userId: string
  private senderPhone: string
  private baseUrl = 'https://apis.aligo.in/send/'

  constructor() {
    this.apiKey = process.env.ALIGO_API_KEY!
    this.userId = process.env.ALIGO_USER_ID!
    this.senderPhone = process.env.ALIGO_SENDER_PHONE!

    if (!this.apiKey || !this.userId || !this.senderPhone) {
      throw new Error('Aligo API credentials not configured')
    }
  }

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 메시지 타입 결정 (SMS: 90자 이내, LMS: 2000자 이내)
      const messageType = request.content.body.length <= 90 ? 'SMS' : 'LMS'

      // 알리고 API 요청
      const formData = new URLSearchParams({
        key: this.apiKey,
        user_id: this.userId,
        sender: this.senderPhone,
        receiver: request.recipient.phone!,
        msg: request.content.body,
        msg_type: messageType,
        // 제목 (LMS만)
        ...(messageType === 'LMS' && request.content.subject ? {
          title: request.content.subject
        } : {}),
        // 테스트 모드 (개발 환경)
        testmode_yn: process.env.NODE_ENV === 'production' ? 'N' : 'Y',
      })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      const data = await response.json()

      // 알리고 응답 코드
      // 1: 성공, -100~-199: 시스템 에러, -200~-299: 발송 실패
      if (data.result_code === '1') {
        return {
          success: true,
          messageId: data.msg_id,
          cost: parseFloat(data.msg_count) * (messageType === 'SMS' ? 15 : 45), // 원 단위
        }
      } else {
        return {
          success: false,
          error: `Aligo Error ${data.result_code}: ${data.message}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async checkBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const response = await fetch('https://apis.aligo.in/remain/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          key: this.apiKey,
          user_id: this.userId,
        }),
      })

      const data = await response.json()

      return {
        balance: parseFloat(data.SMS_CNT || '0') + parseFloat(data.LMS_CNT || '0'),
        currency: 'credits',
      }
    } catch (error) {
      throw new Error('Failed to check Aligo balance')
    }
  }

  async getDeliveryStatus(messageId: string) {
    // 알리고는 실시간 조회 API가 제한적이므로 콜백으로 처리
    return {
      status: 'pending' as const,
    }
  }
}
```

---

## 리포트 생성 로직

### Report Entity

```typescript
// src/domain/entities/Report.ts
export enum ReportType {
  STUDENT_MONTHLY = 'student_monthly',    // 학생 월간 리포트
  STUDENT_EXAM = 'student_exam',          // 학생 시험 리포트
  CLASS_SUMMARY = 'class_summary',        // 클래스 요약
}

export interface ReportData {
  // 학생 정보
  studentName: string
  studentCode: string
  grade: string

  // 기간
  startDate: string
  endDate: string

  // 성적
  exams: Array<{
    name: string
    date: string
    score: number
    percentage: number
    classAverage?: number
    rank?: number
  }>
  avgScore: number

  // 출석
  attendanceRate: number
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number

  // 숙제
  homeworkRate: number
  totalTodos: number
  completedTodos: number

  // 상담
  consultations: Array<{
    date: string
    type: string
    summary: string
  }>

  // 종합 평가 (선택)
  overallComment?: string
}

export class Report {
  constructor(
    public readonly id: string,
    public readonly type: ReportType,
    public readonly studentId: string,
    public readonly data: ReportData,
    public readonly createdAt: Date,
    public readonly generatedBy: string, // 생성자 (강사 ID)
  ) {}

  /**
   * 리포트를 문자 메시지 형식으로 변환 (LMS: 2000자 이내)
   */
  toSMSMessage(): string {
    const { studentName, grade, startDate, endDate, avgScore, attendanceRate, homeworkRate } = this.data

    return `[${studentName} 학습 리포트]

📅 기간: ${startDate} ~ ${endDate}
🎓 학년: ${grade}

📊 성적
- 평균: ${avgScore}점
${this.data.exams.slice(0, 3).map(e => `- ${e.name}: ${e.percentage}%`).join('\n')}

📅 출석률: ${attendanceRate}%
✏️ 숙제 완료율: ${homeworkRate}%

${this.data.overallComment ? `\n💬 종합평가\n${this.data.overallComment}` : ''}

문의: [학원명] [연락처]`
  }

  /**
   * 카카오톡 템플릿 변수로 변환
   */
  toKakaoVariables(): Record<string, string> {
    return {
      studentName: this.data.studentName,
      grade: this.data.grade,
      period: `${this.data.startDate} ~ ${this.data.endDate}`,
      avgScore: this.data.avgScore.toString(),
      attendanceRate: this.data.attendanceRate.toString(),
      homeworkRate: this.data.homeworkRate.toString(),
    }
  }
}
```

### GenerateStudentReportUseCase

```typescript
// src/application/use-cases/report/GenerateStudentReportUseCase.ts
export class GenerateStudentReportUseCase {
  constructor(
    private reportRepository: IReportRepository,
    private studentRepository: IStudentRepository,
  ) {}

  async execute(params: {
    studentId: string
    startDate: string
    endDate: string
    type: ReportType
    generatedBy: string
    comment?: string
  }): Promise<Report> {
    // 1. 학생 정보 조회
    const student = await this.studentRepository.findById(params.studentId)
    if (!student) throw new NotFoundError('학생')

    // 2. 데이터 수집 (병렬 처리)
    const [exams, attendance, todos, consultations] = await Promise.all([
      this.getExamScores(params.studentId, params.startDate, params.endDate),
      this.getAttendance(params.studentId, params.startDate, params.endDate),
      this.getTodos(params.studentId, params.startDate, params.endDate),
      this.getConsultations(params.studentId, params.startDate, params.endDate),
    ])

    // 3. 통계 계산
    const avgScore = exams.reduce((sum, e) => sum + e.percentage, 0) / exams.length || 0
    const attendanceRate = (attendance.presentDays / attendance.totalDays) * 100 || 0
    const homeworkRate = (todos.completedTodos / todos.totalTodos) * 100 || 0

    // 4. Report 엔티티 생성
    const report = new Report(
      crypto.randomUUID(),
      params.type,
      params.studentId,
      {
        studentName: student.name,
        studentCode: student.studentCode,
        grade: student.grade,
        startDate: params.startDate,
        endDate: params.endDate,
        exams,
        avgScore,
        attendanceRate,
        totalDays: attendance.totalDays,
        presentDays: attendance.presentDays,
        lateDays: attendance.lateDays,
        absentDays: attendance.absentDays,
        homeworkRate,
        totalTodos: todos.totalTodos,
        completedTodos: todos.completedTodos,
        consultations,
        overallComment: params.comment,
      },
      new Date(),
      params.generatedBy,
    )

    // 5. 리포트 저장
    await this.reportRepository.save(report)

    return report
  }
}
```

---

## 확장 가능성

### 다른 채널 구현 예시

#### 1. 카카오톡 알림톡 (추후)

```typescript
// src/infrastructure/messaging/KakaoProvider.ts
export class KakaoProvider implements IMessageProvider {
  readonly channel = MessageChannel.KAKAO
  readonly name = 'KakaoTalk'

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    // 카카오 비즈메시지 API 호출
    // https://developers.kakao.com/docs/latest/ko/message/rest-api
  }
}
```

#### 2. 이메일 (추후)

```typescript
// src/infrastructure/messaging/EmailProvider.ts
export class EmailProvider implements IMessageProvider {
  readonly channel = MessageChannel.EMAIL
  readonly name = 'Email (Resend)'

  async send(request: SendMessageRequest): Promise<SendMessageResponse> {
    // Resend API 또는 SMTP 사용
  }
}
```

### MessageProviderFactory

```typescript
// src/infrastructure/messaging/MessageProviderFactory.ts
export class MessageProviderFactory {
  private providers: Map<MessageChannel, IMessageProvider> = new Map()

  constructor() {
    // 현재 활성화된 Provider 등록
    this.providers.set(MessageChannel.SMS, new AligoProvider())
    this.providers.set(MessageChannel.LMS, new AligoProvider())

    // 추후 추가
    // this.providers.set(MessageChannel.KAKAO, new KakaoProvider())
    // this.providers.set(MessageChannel.EMAIL, new EmailProvider())
  }

  getProvider(channel: MessageChannel): IMessageProvider {
    const provider = this.providers.get(channel)
    if (!provider) {
      throw new Error(`No provider configured for channel: ${channel}`)
    }
    return provider
  }

  getAllProviders(): IMessageProvider[] {
    return Array.from(this.providers.values())
  }
}
```

---

## 구현 계획

### Phase 1: 메시지 전송 인프라 ✅ (완료)
- [x] 설계 문서 작성
- [x] IMessageProvider 인터페이스 정의
- [x] AligoProvider 구현
- [x] MessageProviderFactory 구현
- [x] 환경변수 검증 추가
- [x] 데이터베이스 마이그레이션 (reports, message_logs)

### Phase 2: 리포트 생성 및 PDF ✅ (완료)
- [x] Report 엔티티 정의
- [x] IReportRepository 인터페이스
- [x] IMessageLogRepository 인터페이스
- [x] ReportRepository 구현 (Supabase)
- [x] MessageLogRepository 구현 (Supabase)
- [x] GenerateStudentReportUseCase 구현
- [x] SendReportUseCase 구현
- [x] PDF 템플릿 개발 (@react-pdf/renderer)
- [x] PDFGenerator 유틸리티

### Phase 3: Server Actions ✅ (완료)
- [x] generateStudentReport - 리포트 생성
- [x] sendReport - 리포트 전송 (SMS/LMS/카카오톡/이메일)
- [x] generateAndSendReport - 원스톱 생성 + 전송
- [x] getStudentReports - 리포트 이력 조회
- [x] getMessageLogs - 메시지 전송 이력 조회
- [x] TypeScript 타입 체크 통과

### Phase 4: UI 통합 (예정)
- [ ] 리포트 발송 버튼 (학생 상세 페이지)
- [ ] 일괄 발송 UI (클래스 관리)
- [ ] 발송 이력 조회 페이지
- [ ] PDF 미리보기 기능

### Phase 5: 테스트 및 배포 (예정)
- [ ] 단위 테스트 (Provider, UseCase)
- [ ] 통합 테스트 (전체 흐름)
- [ ] 알리고 테스트 모드 검증
- [ ] PDF 생성 테스트
- [ ] 프로덕션 배포

---

## 데이터베이스 마이그레이션

```sql
-- reports 테이블
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  type text NOT NULL, -- 'student_monthly', 'student_exam', 'class_summary'
  student_id uuid REFERENCES students(id),
  class_id uuid REFERENCES classes(id),
  data jsonb NOT NULL, -- ReportData
  generated_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- message_logs 테이블
CREATE TABLE message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel text NOT NULL, -- 'sms', 'lms', 'kakao', 'email'
  provider text NOT NULL, -- 'Aligo', 'KakaoTalk', 'Resend'
  recipient_name text NOT NULL,
  recipient_contact text NOT NULL, -- phone or email
  message_body text NOT NULL,
  message_id text, -- 외부 서비스 메시지 ID
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  cost numeric(10,2),
  error_message text,
  metadata jsonb, -- { studentId, reportId, senderId }
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_reports_tenant_student ON reports(tenant_id, student_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_message_logs_tenant ON message_logs(tenant_id);
CREATE INDEX idx_message_logs_status ON message_logs(status);
CREATE INDEX idx_message_logs_created ON message_logs(created_at DESC);

-- RLS 정책
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports are viewable by tenant members"
ON reports FOR SELECT
USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Message logs are viewable by tenant members"
ON message_logs FOR SELECT
USING (tenant_id = get_current_tenant_id());
```

---

**작성자**: Claude Code
**날짜**: 2025-10-23
**버전**: 1.0.0
