# Acadesk 개선 작업 추적

> 근거: [docs/COMPREHENSIVE_AUDIT_2026-07.md](docs/COMPREHENSIVE_AUDIT_2026-07.md) (2026-07-16 종합 감사)
> 규칙: 완료 시 `[x]` + 완료일 기입. 작업 착수 전 감사 리포트의 해당 섹션에서 파일 참조 확인.

## Phase 1 — 필수: 신뢰와 안정 (목표: ~4주)

### 1.1 예약 배치 서버 트리거화 ⭐ 최우선 ✅ (2026-07-17 완료)
- [x] `vercel.json` 생성 + cron 설정 (5분 간격)
- [x] `/api/cron/run-due-jobs` 라우트 추가 (Bearer `CRON_SECRET` 검증, fail-closed)
- [x] 크론이 세션 없이 실행할 수 있도록 시스템 컨텍스트 도입 (`src/lib/auth/system-context.ts`, AsyncLocalStorage — 잡 생성자 `created_by` 자격으로 실행)
- [x] due 판정 로직 공유화 (`src/lib/batch/due-jobs.ts` + 단위 테스트 6종)
- [x] `JobsContent.tsx` 마운트 실행을 비차단 보조 트리거로 강등 (목록 조회 차단 제거)
- [ ] 배포 후: Vercel 환경변수에 `CRON_SECRET` 등록 + 크론 첫 실행 로그 확인 (수동)

### 1.2 키오스크 보안 (High 3건) ✅ (2026-07-17 완료)
- [x] PIN/전화 인증에 DB 기반 레이트리밋 도입 — `kiosk_auth_attempts` 테이블(migration 20260717000001) + `src/lib/kiosk-rate-limit.ts` (식별자별 5회/5분 + 테넌트별 30회/10분, 판정 쿼리 실패 시 fail-open)
- [x] `getStudentsByTenant` 전체 명부 반환 제거 → `searchKioskStudents` (2글자 이상 검색, 최대 20건, ilike 이스케이프)
- [x] 기본 PIN `1234` 폴백 제거 — 보호자 전화 미등록 학생은 인증 거부, UI 힌트 문구 교체
- [ ] 배포 후: `supabase db push`로 migration 적용 (미적용 시 레이트리밋은 fail-open으로 무해하게 비활성)

### 1.3 CI/CD + 품질 게이트 ✅ (2026-07-17 완료)
- [x] `.github/workflows/ci.yml`: type-check + lint + test:run + build (PR/main push, 더미 env로 빌드)
- [x] husky + lint-staged pre-commit 훅 (`*.{ts,tsx}` → eslint --fix --max-warnings=0)
- [x] `internal/tech/Architecture.md`의 CI/CD 오기재 수정 (migrations 경로도 supabase/로 정정)

### 1.4 에러 트래킹 ✅ (2026-07-17 완료)
- [x] `@sentry/nextjs` 설치 + instrumentation 3종(server/edge/client) — DSN 미설정 시 완전 no-op
- [x] `logError` → Sentry 전송 (운영성 에러는 warn만, Next 내부 신호 DYNAMIC_SERVER_USAGE/NEXT_REDIRECT/NEXT_NOT_FOUND 필터)
- [x] `withServerAction`/`withServerActionVoid` catch가 `logError` 경유하도록 통합 — 모든 래퍼 기반 액션 에러가 Sentry로
- [x] 인증/권한 실패를 `AuthorizationError`(operational)로 분류 — 세션 만료 노이즈 차단
- [x] `global-error.tsx` + `(dashboard)/error.tsx` 그룹 레벨 바운더리 (하위 전 세그먼트 커버)
- [x] 데드 코드 `src/lib/monitoring/error-reporter.ts` 삭제 (import 0건 확인)
- [ ] 배포 후: Sentry 프로젝트 생성 → Vercel env에 `NEXT_PUBLIC_SENTRY_DSN` 등록 (소스맵은 SENTRY_AUTH_TOKEN/ORG/PROJECT 추가 시)

### 1.5 폰트 최적화 (LCP)
- [ ] Noto Sans KR 9.9MB TTF → woff2 + 한글 서브셋 (`src/app/layout.tsx:15`)
- [ ] Inter Tight 567KB TTF도 동일 처리

### 1.6 DB 정합성
- [ ] 스키마 드리프트 해소: `payments`/`tuition_invoices` 정의 마이그레이션 확정 (대시보드 RPC가 참조 중), seed-schema 재생성
- [ ] `class_enrollments` UNIQUE → `WHERE status='active'` 부분 유니크로 전환 (탈퇴 후 재등록 허용)
- [ ] `notification_logs.tenant_id` NOT NULL + ON DELETE CASCADE로 변경
- [ ] `exam_scores` 범위 CHECK 추가 (percentage 0~100, score≥0)
- [ ] `students.kiosk_pin` 테넌트 내 UNIQUE
- [ ] 누락 인덱스: `attendance(tenant_id, attendance_date)`, `class_enrollments(tenant_id, status)` 부분 인덱스

### 1.7 보안 소유권 검증 (Medium)
- [ ] `awardStudentPoints`(`student-points.ts:193`)에 `filterOwnedStudentIds` 적용
- [ ] `createConsultation`(`consultations.ts:422`)에 학생 소유권 검증 추가
- [ ] `/admin` 레이아웃 레벨 플랫폼관리자 가드 추가 (심층방어)
- [ ] `getCurrentTenantId`(`src/lib/auth/helpers.ts:50`)에 `deleted_at is null` 필터 추가

### 1.8 백업
- [ ] Supabase PITR 활성화 확인 + RPO/RTO 문서화

## Phase 2 — 중요: 수익화와 성능 (목표: +6~8주)

### 2.1 수납/청구 백엔드 실구현 ⭐ 최대 기능 공백
- [ ] `tuition_invoices`/`payments` 테이블 마이그레이션 (RLS 포함)
- [ ] `src/app/actions/payments/` 서버 액션 (청구서 생성/납부 기록/미납 조회)
- [ ] 기존 UI(`create-invoices-dialog` 등)의 mock 데이터 제거 + 실연결
- [ ] `payment_confirmed`/`payment_overdue` 알림톡 배선
- [ ] `tuitionManagement` 플래그 beta → active 전환

### 2.2 미배선 알림 12종 크론 연결
- [ ] homework_deadline, monthly/weekly_report_ready, exam_scheduled, retest_required, makeup_class_scheduled, class_schedule_changed, academy_closure_notice, book_lending_reminder 등 fire 지점 구현 (1.1의 크론 인프라 활용)

### 2.3 쓰기 원자화 (RPC)
- [ ] `createStudentComplete`(`students/mutations.ts:31`) 5단계 INSERT → 단일 SECURITY DEFINER RPC
- [ ] `bulkDeleteStudents`, `createHomework` 다단계 mutation 원자화

### 2.4 페이지네이션 표준화
- [ ] `consultations.ts:114` 패턴을 공통 유틸로 추출
- [ ] `todos.ts:58`, `homeworks.ts:59`, `guardians.ts:328`, `classes.ts:72`, `reports/queries.ts:43(period=all)` 적용
- [ ] select('*') → 명시 컬럼 (특히 `messaging/config.ts` 시크릿 오버페치)

### 2.5 발송 성능
- [ ] `messaging/messages.ts:475`, `reports/send.ts:733` 순차 발송 → 동시성 제한(5~10) 병렬화
- [ ] 실패 항목 자동 재시도 (현재 수동 버튼만)
- [ ] `batch/jobs.ts:261-305` 아이템당 중복 status 재조회 제거
- [ ] `bulkUpdateStudents`(`students/bulk.ts:26`) N개 UPDATE → 단일 upsert

### 2.6 프론트 성능
- [ ] 학생 목록 SSR 프리페치 + HydrationBoundary (`getStudentsListEnriched` limit 추가 포함)
- [ ] 출석 로스터 가상화 (`attendance-check-page.tsx:119`)
- [ ] `StudentDetailClient.tsx:63` 컨텍스트 value `useMemo`
- [ ] exceljs 지연 로드, `react-big-calendar` 데드 의존성 제거

### 2.7 테스트 안전망
- [ ] `playwright.config.ts` + 핵심 e2e 4종 (로그인→출석→성적 입력→메시지 발송)
- [ ] 테넌트 격리 회귀 테스트 스위트 (두 테넌트 시드, 교차 접근 전부 실패 검증)

## Phase 3 — 고도화: 경쟁 우위

- [ ] 주간 시간표 그리드 (요일×시간 UI + 강의실 배정 + 충돌 검사)
- [ ] 학부모 웹 포털 (조회 전용, `/r/[linkId]` 인프라 확장)
- [ ] SaaS 빌링 + 학생 수 기반 플랜 게이팅 (`PricingStrategy.md` 티어 구현)
- [ ] 전역 커맨드 팔레트 ⌘K (cmdk 이미 설치됨)
- [ ] 보강/클리닉 관리 (결석→보강 제안→알림 플로우)
- [ ] 입학 대기자(waitlist) 관리
- [ ] 대시보드 위젯별 Suspense 스트리밍 (`dashboard.ts:88` 단일 페이로드 분해)
- [ ] `tenant_daily_stats` KPI 집계 테이블 + pg_cron 갱신
- [ ] `admin_audit_logs` 테이블 (권한 변경·삭제·설정 변경 추적)
- [ ] 피처 플래그 DB화 (런타임 변경 + 테넌트별 override + 킬스위치)
- [ ] 제품 분석 도구 도입 (PostHog 또는 Vercel Analytics)
- [ ] `/short`·`/s` 오픈 리다이렉트 도메인 화이트리스트
- [ ] `tuitionManagement` inactive 메뉴 노출 정리 (숨김 또는 "준비 중" 뱃지)
- [ ] 온보딩 마법사 확장 (학생 CSV → 반 생성 → 카카오 연동 체크리스트)
- [ ] `/api/health` 헬스체크 엔드포인트

## Phase 4 — AI 혁신 (Phase 2~3과 병행 가능)

- [ ] 리포트 코멘트 AI 초안 (CommentStep + `collectReportMetricsByStudent` 데이터 활용) ⭐ ROI 최대
- [ ] 상담 노트 요약 + 후속 액션 추출
- [ ] 위험 학생 조기 경보 (출결 변화 + 성적 하락 + 과제 미제출 스코어 → `student-alerts` 위젯)
- [ ] 학부모 메시지 초안 생성 (초안 모드 — 반드시 사람 확인 후 발송)
- [ ] 성적 분석 내러티브 (성장 차트 자연어 해설)

## 문서-구현 정합화 (백로그)

- [ ] CLAUDE.md 파티셔닝 서술 수정 (미구현 — 1만 테넌트 시점 조건부 계획으로)
- [ ] CLAUDE.md UUID v7 서술 수정 또는 `uuid_generate_v7()` 도입 결정
- [ ] ENUM 5종 → ref 테이블 이관 결정 (`message_channel`, `messaging_provider` 우선)
- [ ] 중복 인덱스 정리 (단일 tenant_id vs 복합 선두부 중복)
- [ ] 에러 처리 스타일 `withServerAction` 래퍼로 점진 통일
- [ ] 거대 액션 파일 분할 (guardians 1,735줄 / textbooks 1,725줄 / exams 1,378줄)
