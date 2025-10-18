# 나머지 도메인 Clean Architecture 리팩토링 가이드

## 완료된 도메인

- ✅ **Students** - Entity, Repository, Use Cases
- ✅ **Todo** - Entity, Repository, Use Cases
- ✅ **Auth** - Entity, Repository, Use Cases (완전 리팩토링)
- ✅ **Grades** - Entity, Repository (Use Cases 미완성)

## 진행 중인 도메인

### Attendance (출석)

**Value Objects:**
- ✅ `AttendanceStatus.ts` - present/late/absent/excused
- ✅ `SessionStatus.ts` - scheduled/in_progress/completed/cancelled

**필요한 작업:**

```
src/domain/entities/
├── AttendanceSession.ts        # 세션 엔티티
└── Attendance.ts                # 출석 기록 엔티티

src/domain/repositories/
├── IAttendanceSessionRepository.ts
└── IAttendanceRepository.ts

src/infrastructure/database/
├── SupabaseAttendanceSessionRepository.ts
└── SupabaseAttendanceRepository.ts

src/application/use-cases/attendance/
├── CreateSessionUseCase.ts
├── UpdateSessionStatusUseCase.ts
├── RecordAttendanceUseCase.ts
├── BulkRecordAttendanceUseCase.ts
└── GetAttendanceStatsUseCase.ts
```

**Entity 구조 예시:**

```typescript
// AttendanceSession Entity
export class AttendanceSession {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly classId: string,
    private readonly sessionDate: Date,
    private readonly scheduledStartAt: Date,
    private readonly scheduledEndAt: Date,
    private readonly status: SessionStatus,
    private readonly actualStartAt: Date | null,
    private readonly actualEndAt: Date | null,
    private readonly notes: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  // Business Logic
  start(actualStartTime: Date): AttendanceSession
  complete(actualEndTime: Date): AttendanceSession
  cancel(): AttendanceSession
  canTakeAttendance(): boolean
  getDuration(): number // minutes
  isOvertime(): boolean
}

// Attendance Entity
export class Attendance {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly sessionId: string,
    private readonly studentId: string,
    private readonly status: AttendanceStatus,
    private readonly checkInAt: Date | null,
    private readonly checkOutAt: Date | null,
    private readonly notes: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  // Business Logic
  markAsPresent(checkInTime: Date): Attendance
  markAsLate(checkInTime: Date): Attendance
  markAsAbsent(reason?: string): Attendance
  excuseAbsence(reason: string): Attendance
  checkOut(checkOutTime: Date): Attendance
  getAttendanceDuration(): number | null
}
```

---

## 나머지 도메인 리팩토링 계획

### 1. Grades (성적) - Use Cases 완성

**이미 완료됨:**
- ✅ Domain Layer (Entity, Value Objects)
- ✅ Infrastructure Layer (Repository)

**필요한 작업:**

```
src/application/use-cases/exam/
├── CreateExamUseCase.ts
├── UpdateExamUseCase.ts
├── GetUpcomingExamsUseCase.ts
└── DeleteExamUseCase.ts

src/application/use-cases/exam-score/
├── RecordScoreUseCase.ts
├── BulkRecordScoresUseCase.ts
├── UpdateScoreUseCase.ts
├── GetExamStatsUseCase.ts
└── FindLowPerformersUseCase.ts

src/application/factories/
├── examUseCaseFactory.ts
└── examUseCaseFactory.client.ts
```

**Use Case 예시:**

```typescript
// RecordScoreUseCase
export class RecordScoreUseCase {
  constructor(
    private readonly examScoreRepository: IExamScoreRepository,
    private readonly examRepository: IExamRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  async execute(input: {
    examId: string
    studentId: string
    scoreInput: string // "30/32" format
    feedback?: string
  }): Promise<ExamScoreDTO> {
    // 1. Validate exam exists
    const exam = await this.examRepository.findById(input.examId)
    if (!exam) {
      throw new Error('시험을 찾을 수 없습니다.')
    }

    // 2. Validate student exists
    const student = await this.studentRepository.findById(input.studentId)
    if (!student) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    // 3. Parse score (30/32 format)
    const score = Score.fromString(input.scoreInput, exam.getTotalQuestions())

    // 4. Create ExamScore entity
    const examScore = ExamScore.create({
      tenantId: exam.getTenantId(),
      examId: input.examId,
      studentId: input.studentId,
      score,
      feedback: input.feedback ?? null,
    })

    // 5. Save
    const saved = await this.examScoreRepository.save(examScore)

    return saved.toDTO()
  }
}
```

---

### 2. Notifications (알림)

**필요한 Value Objects:**
```typescript
// NotificationType.ts
type NotificationTypeValue = 'attendance_alert' | 'grade_alert' | 'todo_reminder' | 'report_ready'

// NotificationChannel.ts
type NotificationChannelValue = 'email' | 'sms' | 'push' | 'in_app'

// NotificationStatus.ts
type NotificationStatusValue = 'pending' | 'sent' | 'failed' | 'read'
```

**Entity 예시:**

```typescript
export class Notification {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly recipientId: string,
    private readonly type: NotificationType,
    private readonly channel: NotificationChannel,
    private readonly status: NotificationStatus,
    private readonly title: string,
    private readonly message: string,
    private readonly metadata: Record<string, unknown>,
    private readonly sentAt: Date | null,
    private readonly readAt: Date | null,
    private readonly createdAt: Date
  ) {}

  // Business Logic
  markAsSent(sentTime: Date): Notification
  markAsFailed(error: string): Notification
  markAsRead(readTime: Date): Notification
  canResend(): boolean
  isExpired(expiryHours: number): boolean
}
```

**Use Cases:**
- `SendNotificationUseCase`
- `SendBulkNotificationsUseCase`
- `MarkAsReadUseCase`
- `GetUnreadNotificationsUseCase`
- `ResendFailedNotificationUseCase`

---

### 3. Reports (리포트)

**필요한 Value Objects:**
```typescript
// ReportType.ts
type ReportTypeValue = 'weekly' | 'monthly' | 'exam' | 'progress'

// ReportStatus.ts
type ReportStatusValue = 'draft' | 'generated' | 'sent' | 'failed'

// ReportFormat.ts
type ReportFormatValue = 'pdf' | 'html' | 'markdown'
```

**Entity 예시:**

```typescript
export class Report {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly studentId: string,
    private readonly type: ReportType,
    private readonly status: ReportStatus,
    private readonly title: string,
    private readonly content: string,
    private readonly periodStart: Date,
    private readonly periodEnd: Date,
    private readonly pdfUrl: string | null,
    private readonly sentAt: Date | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date
  ) {}

  // Business Logic
  generate(content: string): Report
  markAsSent(sentTime: Date): Report
  markAsFailed(error: string): Report
  setPdfUrl(url: string): Report
  canSend(): boolean
  isOutdated(days: number): boolean
}
```

**Use Cases:**
- `GenerateWeeklyReportUseCase`
- `GenerateMonthlyReportUseCase`
- `GenerateExamReportUseCase`
- `SendReportToParentsUseCase`
- `RegenerateReportUseCase`

---

### 4. Subject (교과목)

**Value Objects:**
```typescript
// SubjectCode.ts
export class SubjectCode {
  static create(code: string): SubjectCode
  getValue(): string
  isValid(): boolean
}
```

**Entity 예시:**

```typescript
export class Subject {
  private constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private readonly code: SubjectCode,
    private readonly name: string,
    private readonly description: string | null,
    private readonly color: string,
    private readonly isActive: boolean,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
    private readonly deletedAt: Date | null
  ) {}

  // Business Logic
  activate(): Subject
  deactivate(): Subject
  updateDetails(name: string, description?: string): Subject
  delete(): Subject
}
```

**Use Cases:**
- `CreateSubjectUseCase`
- `UpdateSubjectUseCase`
- `ActivateSubjectUseCase`
- `DeactivateSubjectUseCase`
- `DeleteSubjectUseCase`

---

## 리팩토링 우선순위

### Phase 1: 핵심 기능 완성 (1-2주)
1. ✅ Auth - 완료
2. ⏳ **Grades Use Cases** - 성적 입력 자동화 (P0)
3. ⏳ **Reports** - 리포트 자동 생성 (P0)
4. ⏳ **Attendance** - 출석 관리 (P1)

### Phase 2: 보조 기능 (2-3주)
5. Notifications - 자동 알림
6. Subject - 교과목 관리

### Phase 3: 최적화 (3-4주)
7. 기존 Service 파일 Deprecation
8. 컴포넌트 마이그레이션
9. 단위 테스트 작성
10. E2E 테스트 작성

---

## 공통 패턴

### Value Objects
- 검증 로직 캡슐화
- 불변성 보장
- 비즈니스 규칙 강제

### Entities
- 도메인 로직 집중
- 불변성 패턴 (새 인스턴스 반환)
- DTO 변환 메서드

### Repositories
- Interface (Domain Layer)
- Supabase Implementation (Infrastructure Layer)
- Entity ↔ Database Row 매핑

### Use Cases
- 단일 책임 원칙
- 입력 검증
- 비즈니스 로직 오케스트레이션

### Factory Functions
- Server-side (async)
- Client-side (sync)
- Dependency Injection

---

## 마이그레이션 체크리스트

### 각 도메인별

- [ ] Value Objects 작성
- [ ] Entities 작성
- [ ] Repository Interfaces 작성
- [ ] Supabase Repositories 구현
- [ ] Use Cases 작성
- [ ] Factory Functions 작성
- [ ] 기존 Service Deprecation
- [ ] 문서화 작성
- [ ] 단위 테스트 작성

### 전체 프로젝트

- [ ] 모든 도메인 리팩토링 완료
- [ ] API Routes 마이그레이션
- [ ] 컴포넌트 마이그레이션
- [ ] E2E 테스트 작성
- [ ] 성능 테스트
- [ ] 프로덕션 배포

---

## 참고

- `docs/CLEAN_ARCHITECTURE_MIGRATION.md` - Students/Todo 리팩토링
- `docs/GRADES_CLEAN_ARCHITECTURE.md` - Grades 리팩토링
- `docs/AUTH_CLEAN_ARCHITECTURE.md` - Auth 리팩토링
- `src/application/README.md` - 사용 가이드

---

## 다음 단계

1. **Grades Use Cases 완성** - 가장 우선순위 높음 (P0)
2. **Attendance 전체 리팩토링** - 비즈니스 로직 복잡함
3. **Reports 전체 리팩토링** - 핵심 기능

각 도메인별로 위의 패턴을 따라 진행하면 됩니다!
