# Batch Workbench 통합 설계 참고문서 (2안)

작성일: 2026-02-22  
대상: 리포트 일괄생성, 코멘트 일괄작업, 일괄전송 UX 통합

## 1. 목적

현재 분리된 3개 대량 작업 UI를 단일 실행 경험으로 통합한다.

- 기존: `리포트 일괄생성`, `코멘트 일괄작업`, `일괄전송`이 각각 다른 화면과 규칙 사용
- 목표: 작업 종류는 유지하고, 사용자 플로우와 실행/모니터링 UX는 단일화

핵심 효과:

- 학습 비용 감소
- 작업 완료 시간 단축
- 실패 대응(재시도, 원인 확인) 일관화

## 2. 핵심 원칙

1. 기능 통합이 아니라 작업 흐름 통합
2. 항상 같은 단계 사용: `대상 선택 -> 작업 선택 -> 옵션 설정 -> 검토 -> 실행`
3. 실행 결과는 공통 Job 모델로 관리
4. 도메인별 관리 화면(리포트/코멘트/전송)은 실행이 아닌 설정 중심으로 축소

## 3. 정보 구조(IA)

- `일괄작업센터`: 대량 실행 진입 및 템플릿 실행
- `리포트`: 템플릿/출력 규칙/미리보기 관리
- `코멘트`: 템플릿/자동 문구 규칙 관리
- `전송`: 채널/발신 정책/메시지 템플릿 관리
- `작업이력`: 전체 Job 통합 조회

## 4. 표준 사용자 플로우

1. 대상 선택
2. 작업 선택 (`report | comment | send`)
3. 옵션 설정 (작업별 폼)
4. 검토 (영향 요약, 샘플, 리스크)
5. 실행 (진행/실패/재시도)

## 5. 라우트 설계

- `/batch`: 일괄작업센터 홈
- `/batch/new`: 드래프트 생성 후 Step 1로 이동
- `/batch/new/:draftId/targets`: Step 1 대상 선택
- `/batch/new/:draftId/action`: Step 2 작업 선택
- `/batch/new/:draftId/options`: Step 3 옵션 설정
- `/batch/new/:draftId/review`: Step 4 검토
- `/batch/new/:draftId/run`: Step 5 실행
- `/jobs`: 통합 작업이력
- `/jobs/:jobId`: 작업 상세
- `/reports`, `/comments`, `/messages`: 관리 전용, 실행 버튼은 `/batch/new`로 연결

## 6. 컴포넌트 구조

### 6.1 Workbench 홈

- `BatchWorkbenchPage`
- `BatchStartPanel`
- `RecentJobsList`
- `RetryFailedPanel`
- `SavedBatchTemplates`

### 6.2 Wizard

- `BatchWizardPage`
- `WizardLayout`
- `WizardStepper`
- `WizardStepGuard`
- `StepTargets`
- `StepAction`
- `StepOptions`
- `StepReview`
- `StepRun`

### 6.3 Step 하위 공통 컴포넌트

- `TargetFilterPanel`
- `TargetTable`
- `SelectionSummary`
- `ActionCardGroup`
- `OptionsFormSwitch`
- `ImpactSummaryCard`
- `PreviewSamplesTable`
- `RiskAlertList`
- `RunProgressPanel`
- `RunResultActions`

### 6.4 Job 모니터링

- `JobsPage`
- `JobsFilterBar`
- `JobsTable`
- `JobDetailPage`
- `JobProgressHeader`
- `JobErrorGroupList`
- `RetryFailedButton`
- `DownloadErrorsButton`

## 7. 상태 모델

```ts
type BatchActionType = "report" | "comment" | "send";
type BatchDraftStatus = "draft" | "ready" | "running" | "archived";
type JobStatus = "queued" | "running" | "partial_failed" | "succeeded" | "failed" | "canceled";

interface BatchDraft {
  id: string;
  status: BatchDraftStatus;
  step: "targets" | "action" | "options" | "review" | "run";
  actionType?: BatchActionType;
  targetSnapshotCount: number;
  options?: ReportOptions | CommentOptions | SendOptions;
  schedule?: { mode: "now" | "reserved"; runAt?: string };
  dryRun: boolean;
  validation: ValidationIssue[];
}

interface BatchJob {
  id: string;
  draftId: string;
  actionType: BatchActionType;
  status: JobStatus;
  progress: { total: number; processed: number; success: number; failed: number };
}
```

상태 관리 기준:

- 서버 상태: `React Query`(또는 기존 fetch layer)
- 위저드 임시 상태: 서버 우선 저장 (`draftId` 기반 복구)
- 단계 이동은 Guard 기반 제어

## 8. API 계약(초안)

- `POST /api/batch-drafts`
- `GET /api/batch-drafts/:draftId`
- `PATCH /api/batch-drafts/:draftId`
- `POST /api/batch-drafts/:draftId/review`
- `POST /api/batch-drafts/:draftId/execute`
- `GET /api/jobs?type=&status=&from=&to=`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/:jobId/retry-failed`
- `GET /api/jobs/:jobId/errors.csv`

## 9. 검증/안전 가드

1. 대상 0건이면 다음 단계 불가
2. 작업 미선택 상태에서 옵션 단계 접근 불가
3. 검토 단계 `blocking risk` 존재 시 실행 불가
4. 실행 시 서버 권한 재검증
5. 중복 실행 방지: idempotency key + UI 중복 클릭 방지
6. 실패 항목 재시도는 `retryable=true`만 허용

## 10. 구현 전략

1. 1차: Wizard/라우트 뼈대 + Step Guard
2. 2차: 대상 선택/작업 선택/옵션 연결
3. 3차: 검토 API + 샘플/리스크 경고
4. 4차: 실행 + Job 상세 + 재시도/CSV
5. 5차: 기존 리포트/코멘트/전송 일괄 실행 버튼을 Workbench 진입으로 통합

## 11. 성공 지표

1. 대량 작업 완료 시간 감소
2. 실패율 및 재작업률 감소
3. 신규 사용자 첫 성공률 상승
4. 실패 재시도까지의 평균 시간 감소
