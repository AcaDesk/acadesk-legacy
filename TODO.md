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
- [x] `supabase db push`로 migration 적용 완료 (2026-07-17, 1.6 작업에서 일괄 적용)

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

### 1.5 폰트 최적화 (LCP) ✅ (2026-07-17 완료)
- [x] Noto Sans KR/Inter Tight를 `next/font/google`로 전환 — 빌드 시 셀프 호스팅, 한글은 unicode-range 슬라이스 131개(최대 90KB)로 필요한 조각만 로드
- [x] `public/fonts/` 삭제 (~23MB: variable TTF 2종 + 미참조 Bold/Regular TTF 12.4MB)

### 1.6 DB 정합성 ✅ (2026-07-17 완료, 프로덕션 적용됨)
- [x] 스키마 드리프트 해소 — 조사 결과 `payments`/`tuition_invoices`는 레거시 `get_dashboard_data`(코드 미사용)만 참조 → 수납 구현(Phase 2.1)으로 이연. 실제 드리프트는:
  - [x] 코드가 호출하는 `get_dashboard_stats` RPC가 원격에서 삭제된 상태(추적 마이그레이션도 없었음) → migration 20260717000004로 정식 재정의 (stats 위젯 복구)
  - [x] `student_points`/`ref_point_types`가 2026-05 원격 정리 때 삭제됨(코드는 사용 중 → 포인트 위젯 프로덕션 고장) → migration 20260717000002로 복구
  - [x] 마이그레이션 히스토리 정합: 원격 전용 20260520103049를 fetch로 로컬화, 동일 내용 중복이던 로컬 20260520102905 삭제
- [x] `class_enrollments` 전역 UNIQUE → `(class_id, student_id) WHERE status='active' AND deleted_at IS NULL` 부분 유니크 (migration 20260717000003) + 이에 의존하던 `bulkAssignClass` upsert를 조회-후-insert로 수정
- [x] `class_enrollments.deleted_at` 컬럼 추가 — 코드 3곳(kiosk-attendance/dashboard/drilldown)이 존재하지 않는 컬럼을 필터해 조용히 오동작하던 문제 해소
- [x] `notification_logs.tenant_id` NOT NULL + ON DELETE CASCADE (고아 로그 삭제 포함)
- [x] `exam_scores` 범위 CHECK (기존 이상치 클램프 후 적용)
- [x] ~~`students.kiosk_pin` 테넌트 내 UNIQUE~~ → 부적용 결정: kiosk_pin은 bcrypt 해시(같은 PIN도 솔트로 해시가 달라 DB 유니크 무의미)이고, PIN 인증은 student_code로 학생을 특정한 뒤 비교하므로 중복 PIN에 모호성 없음
- [x] 인덱스 보강: `attendance(tenant_id, attendance_date DESC)`, `class_enrollments(tenant_id, status)`, `student_change_logs(changed_by)`
- [ ] `supabase/seed-schema.sql` 스냅샷 재생성 (로컬 시드 플로우 검증 필요 — 별도 작업)
- [ ] **베이스라인 마이그레이션 부재** (2026-07-18 발견) — 마이그레이션 히스토리가 20251003부터 시작해 기반 테이블(tenants/users/students 등)이 어떤 마이그레이션에도 없음 → `supabase db reset`만으로 로컬 부트스트랩 불가. 프로덕션 덤프를 베이스라인 마이그레이션으로 확정 + `migration repair`로 원격 히스토리 정합하는 작업 필요 (신규 환경 구축·CI 통합 테스트의 전제)

### 1.7 보안 소유권 검증 (Medium) ✅ (2026-07-17 완료)
- [x] `awardStudentPoints`에 `filterOwnedStudentIds` 적용
- [x] `createConsultation`에 학생 소유권 검증 추가 (비리드 상담만 해당)
- [x] `src/app/admin/layout.tsx` 신설 — `/admin` 하위 전체 verifyPlatformAdmin 심층방어
- [x] `getCurrentTenantId`에 `deleted_at is null` 필터 추가

### 1.8 백업 ✅ (2026-07-17 문서화 완료)
- [x] RPO/RTO 정의 + 복구 런북 문서화 — `docs/BACKUP_RECOVERY.md`
- [ ] 수동: Supabase Dashboard → Add-ons에서 PITR 활성화 여부 확인/활성화 (Pro 플랜, 보존 7일 권장) — CLI/API로 확인 불가하여 대시보드 확인 필요

## Phase 2 — 중요: 수익화와 성능 (목표: +6~8주)

### 2.1 수납/청구 백엔드 실구현 ⭐ 최대 기능 공백 — 백엔드 완료 (2026-07-18, 프로덕션 적용됨)
- [x] 테이블 3종 마이그레이션 (20260718000001): `tuition_invoices`(월별 중복 청구 방지 부분 유니크, overdue_notified_at), `tuition_invoice_items`(discount 음수 허용), `payments`. RLS 활성화, updated_at 트리거, 연체 스캔 인덱스
- [x] 원자화 RPC 2종: `create_tuition_invoice`(청구서+항목, 학생 소유 검증), `record_tuition_payment`(FOR UPDATE 잠금, 수납 합계 기반 상태 재계산)
- [x] `src/app/actions/payments/` — queries(청구 목록/상세/월 통계/수납 이력, 표준 페이지네이션) + mutations(일괄 청구 생성—중복 스킵 집계, 수납 처리, 청구 삭제, 미납 안내 수동 발송). Zod 검증
- [x] 알림톡 배선: `payment_confirmed`(수납 처리 시) / `payment_overdue`(데일리 크론 — 기한 경과 시 overdue 전환은 구독 무관 수행, 안내 발송은 구독 테넌트만 + claim 스탬프. 수동 발송 액션도 제공)
- [x] UI 6종 실연결 완료 (2026-07-18) — mock 전면 제거. 표준 훅 신설(use-payments-query/mutations, queryKeys.payments·academy). 청구 목록/수납 이력은 서버 페이지네이션+디바운스 검색, 청구서 생성은 재원생 실데이터(반 수 × 기본 수강료, 개별 수정 가능), 수납 다이얼로그는 청구서 상세 자체 조회, 영수증은 실 결제·학원 정보
- [x] 미납 알림 다이얼로그 재작성 — SMS/이메일·자유 메시지 UI 제거(알림톡 사전 승인 체계와 불일치), 승인 템플릿(payment_overdue) 발송으로 통일
- [x] `tuitionManagement` 플래그 inactive → **beta** 전환 (베타 뱃지 노출, 전체 공개 전 실사용 검증 권장)

### 2.2 미배선 알림 배선 ✅ (2026-07-17 완료 — 현시점 배선 가능분 전부)
- [x] `homework_deadline` — 데일리 크론(`/api/cron/daily-reminders`, 09:00 KST)으로 마감 D-1 미완료 숙제 발송. `student_tasks.deadline_reminder_sent_at`로 중복 방지 (migration 20260717000005, 적용됨)
- [x] `book_lending_reminder` — 동일 크론, 반납 D-1 미반납 도서. 기존 `reminder_sent_at` 컬럼 활용
- [x] `exam_scheduled` — 시험 등록 시 액션 배선 (`createExam`/`createExamFromTemplate` → 반 재원생 보호자, `fireClassEventAlimtalk` 헬퍼 신설. 반복 템플릿 생성은 제외)
- [x] `retest_required` — 확인 결과 이미 배선돼 있었음 (`retests.ts` createRetestExam, 감사 목록이 구버전)
- 이연/의도적 미배선 (사유 기록):
  - `payment_confirmed`/`payment_overdue` → 수납 백엔드(2.1) 구현 시 배선
  - `makeup_class_scheduled` → 보강 관리 기능(Phase 3) 구현 시
  - `class_schedule_changed` → 시간표 기능(Phase 3) 구현 시 (현재는 자유 편집이라 모든 수정에 발송되면 노이즈)
  - `monthly/weekly_report_ready` → 의도적 수동: 리포트는 스태프 검토 후 명시적 발송 플로우(sendReportToAllGuardians)가 이미 알림 역할 수행. 생성 즉시 자동 발송은 미검토 리포트 노출 위험
  - `academy_closure_notice` → 공지성 수동 발송 (일괄 메시지 화면에서 발송)

### 2.3 쓰기 원자화 (RPC) ✅ (2026-07-17 완료, 프로덕션 적용됨)
- [x] `create_student_complete` RPC — 보호자 user·guardian·학생 user·student·연결 5단계를 단일 트랜잭션으로 (migration 20260717000006). 읽기(보호자 자동매칭·이메일 중복 사전검증)는 TS 유지, 23505 제약별 친화 메시지 매핑
- [x] `detach_student_relations` RPC — 관계 해제(수강/스케줄/TODO/보호자) + 선택적 퇴원(withdrawal_date/meta)·소프트삭제(students+users)를 하나로. `deleteStudent`/`bulkDeleteStudents`/`withdrawStudent` 세 흐름 모두 이 RPC 사용, `relations.ts`는 얇은 래퍼로 재작성 (테스트 6종 교체)
- [x] `create_homework_with_submissions` RPC — 태스크 일괄 + 빈 제출 레코드 동시 생성 (submission 없는 태스크 근절)

### 2.4 페이지네이션/응답 경계 표준화 ✅ (2026-07-17 완료)
- [x] 공통 유틸 `src/lib/pagination.ts` 신설 (`resolvePageRange`/`buildPaginatedResult`, pageSize 클램프) — consultations가 첫 사용처로 전환. 새 리스트 액션의 표준
- [x] `getTodosWithStudent`/`getHomeworksWithSubmissions` 무제한 조회 경계 — 미완료(실행 대상)는 항상 포함, 완료분만 최근 90일 윈도우. 완료 이력이 누적돼도 응답 크기 유지, UI 변경 없음
- [x] `getGuardiansWithDetails` — 확인 결과 이미 명시 컬럼으로 개선돼 있었음(감사 목록 구버전). 안전 상한 limit(2000)만 추가
- [x] `getReports` period='all' 무제한 → 기본 상한 500
- [x] `getClassesWithDetails` — 확인 결과 이미 unstable_cache 적용돼 있었음(감사 목록 구버전)
- 이연: 3개 리스트의 완전한 서버 페이지네이션(page 컨트롤 UI + 서버 필터 전환)은 UI 재작업 필요 → Phase 3 목록 UX 개선과 함께. `messaging/config.ts` select('*') 시크릿 오버페치는 별도 소규모 정리로 백로그 유지

### 2.5 발송 성능 ✅ (2026-07-17 완료)
- [x] 동시성 유틸 `src/lib/concurrency.ts` 신설 (`mapWithConcurrency` 워커 풀 + `withRetry`, 테스트 7종)
- [x] `sendMessages` 순차 발송 → 대상 분리 후 동시성 5 병렬 + 일시 오류 1회 자동 재시도
- [x] `sendReportToAllGuardians` 수신자별 순차 → 동시성 5 병렬
- [x] `batch/jobs.ts` 아이템당 job/item status 중복 재조회(2쿼리) 제거 — 취소 감지는 배치 경계(3개)로 충분
- [x] `bulkUpdateStudents` — 동일 변경값 그룹핑으로 N쿼리 → G쿼리 (단일 upsert는 테넌트 가드 불가로 배제, 사유 코드 주석)

### 2.6 프론트 성능 ✅ (2026-07-17 완료)
- [x] 학생 목록 SSR 프리페치 — 비동기 서버 컴포넌트 + `HydrationBoundary` 스트리밍 (셸 즉시 페인트, 마운트 후 워터폴 제거, 프리페치 실패 시 클라이언트 재시도로 안전)
- [x] `StudentDetailClient` 컨텍스트 value `useMemo` + `handleDataRefresh` useCallback — 탭 전환 시 7개 탭 리렌더 폭포 제거. `handleConsultationAdded` stale closure도 함수형 업데이트로 수정
- [x] exceljs 지연 로드 — `excel-parser`/`excel-template`이 타입만 정적 import, 실제 로드는 사용 시점 (학생 임포트 라우트 번들 축소)
- [x] `react-big-calendar` + `@types` 데드 의존성 제거, 미사용 `calendar.css` 삭제 (AcademyCalendar는 자체 구현)
- 이연: 출석 로스터 가상화 → 현 재원생 규모(수백 명)에선 클라이언트 페이지네이션으로 충분, 가상 스크롤 라이브러리 도입은 e2e 안전망(2.7) 확보 후 Phase 3에서

### 2.7 테스트 안전망 ✅ (2026-07-18 구성 완료)
- [x] `playwright.config.ts` + 스모크 e2e 5종 (`pnpm test:e2e`) — 로그인 → 대시보드/학생/출석/성적/상담 렌더 검증 (읽기 전용). `E2E_EMAIL`/`E2E_PASSWORD` 미설정 시 skip, dev 서버 자동 기동
- [x] 테넌트 격리 회귀 테스트 (`pnpm test:integration`, `tests/integration/tenant-isolation.test.ts`) — 두 테넌트 시드 후 5개 검증: tenant_id 필터, 소유권 가드, detach RPC 교차 차단, 타 테넌트 보호자 연결 거부, 대시보드 집계 격리. `TEST_SUPABASE_URL`/`TEST_SUPABASE_SERVICE_ROLE_KEY` 미설정 시 skip
- [x] vitest/playwright 분리 (vitest exclude tests/e2e), setup.ts node 환경 호환
- [x] 통합 테스트 로컬 실검증 완료 (2026-07-18) — config.toml 포트 이동(55321/55322, acadesk-v2와 공존) 후 로컬 스택 기동, **5/5 통과**. 절차: `supabase start -x storage-api,imgproxy` → 프로덕션 스키마 덤프 주입 → ref_roles 시드 → `pnpm test:integration` (.env.example 참조)
- [ ] CI에 e2e/통합 잡 추가 — 시크릿(테스트 계정) 및 CI용 로컬 Supabase 기동 구성 필요 (후속)
- 변경: 뮤테이션 포함 e2e(출석 체크·성적 입력·메시지 발송)는 테스트 전용 테넌트 시드 체계가 갖춰진 뒤로 이연 — 현재는 운영 데이터 오염 위험

## Phase 3 — 고도화: 경쟁 우위

- [x] 주간 시간표 그리드 v1 (2026-07-18) — `/classes/timetable`: 요일×시간 그리드(수업 블록: 반/시간/강의실/강사, 수업별 고정 색), **강의실·강사 시간 충돌 감지**(배너+블록 강조), 겹침 레인 분할, 시간 미설정 수업 안내. 순수 로직 `src/lib/timetable.ts` + 테스트 10종. 진입: 수업 목록 헤더 + ⌘K
  - [ ] v2: 그리드에서 드래그로 시간 변경, 수업 저장 시 충돌 사전 경고, 강의실별 필터 보기
- [ ] 학부모 웹 포털 (조회 전용, `/r/[linkId]` 인프라 확장)
- [x] SaaS 빌링 기반 + 학생 수 플랜 게이팅 (2026-07-18, 프로덕션 적용됨) — PG 연동 전 단계:
  - migration 20260718000002: `ref_saas_plans`(trial/starter 30명/standard 100명/growth 300명/unlimited) + `tenant_subscriptions`. **기존 테넌트는 unlimited로 백필** (갑작스런 차단 방지), 신규 테넌트는 구독 부재 시 trial 한도 적용
  - 게이팅: `checkStudentQuota`(fail-open) — `createStudentComplete` + 엑셀 일괄 임포트에서 한도 초과 시 차단
  - `/admin/subscriptions`: 플랫폼 관리자 수동 플랜 지정 UI (테넌트별 학생 수/한도 현황, 초과 표시)
  - [ ] PG(결제사) 연동 — **사업 결정 필요**: 토스페이먼츠/Stripe/수동 계좌이체 중 선택 후 구독 결제·자동 갱신 구현
  - [ ] 테넌트 측 플랜 표시/업그레이드 안내 UI (PG 연동과 함께)
- [x] 전역 커맨드 팔레트 ⌘K (2026-07-18) — `src/components/layout/command-palette.tsx`. 학생 이름/학번 검색→상세 점프(search RPC 재사용), 빠른 액션 6종, 페이지 이동(feature flag 반영). 헤더 트리거 + ⌘K/Ctrl+K, standalone 모드 제외
- [ ] 보강/클리닉 관리 (결석→보강 제안→알림 플로우)
- [ ] 입학 대기자(waitlist) 관리
- [~] 대시보드 스트리밍 — 조사 결과(2026-07-18): 셸-우선 스트리밍은 기존 `loading.tsx`로 이미 확보, 데이터는 5분 unstable_cache라 캐시 미스 1회만 느림. 위젯별 데이터 스트리밍은 react-grid-layout 클라이언트 그리드의 props 구조 전면 재작업(React 19 use() 프로미스 전달) 필요 → 실익 대비 과대해 보류. 재검토 시점: 대시보드 느림 불만 발생 시
- [ ] `tenant_daily_stats` KPI 집계 테이블 — 1,000 테넌트 규모 또는 추세 차트 요구 시점으로 이연 (현재는 캐시로 부하 제한됨)
- [x] `admin_audit_logs` (2026-07-18, 프로덕션 적용됨) — `recordAuditLog`(fire-and-forget) 배선 7곳: 사용자 승인/거부, 플랜 변경, 플래그 변경, 학생 삭제/일괄삭제/퇴원, 청구서 삭제
- [x] 감사 로그 조회 UI `/admin/audit-logs` (2026-07-18) — `actions/admin/audit-logs.ts`(listAuditLogs 페이지네이션 30건 + 액션/테넌트 필터, getAuditLogFilterOptions), 파급 큰 액션(destructive) 배지 강조, KST 표시. admin/layout.tsx에 플랫폼 관리 내비게이션 추가(승인/구독/플래그/감사 로그)
- [x] 피처 플래그 DB화 (2026-07-18, 프로덕션 적용됨) — `feature_flag_overrides` + `getEffectiveFeatureStatus`(60초 캐시 + revalidateTag 즉시 무효화, 우선순위: 테넌트별>전역>코드 기본값). `/admin/feature-flags`에서 재배포 없이 변경(킬스위치). payments 페이지가 첫 DB 게이트
  - [ ] 나머지 feature 게이트 페이지 DB 게이트 전환 (payments 패턴 점진 적용) / 테넌트별 오버라이드 UI
- [ ] 제품 분석 도구 도입 (PostHog 또는 Vercel Analytics)
- [x] `/short`·`/s` 오픈 리다이렉트 도메인 화이트리스트 (2026-07-18) — `isAllowedRedirectTarget` (앱 도메인/VERCEL_URL/localhost만, 스킴 검증 포함, 테스트 5종)
- [ ] `tuitionManagement` inactive 메뉴 노출 정리 (숨김 또는 "준비 중" 뱃지)
- [ ] 온보딩 마법사 확장 (학생 CSV → 반 생성 → 카카오 연동 체크리스트)
- [x] `/api/health` 헬스체크 엔드포인트 (2026-07-18) — DB 연결 확인(3초 타임아웃), 정보 비노출, 비정상 시 503

## Phase 4 — AI 혁신 (Phase 2~3과 병행 가능)

- [x] 리포트 코멘트 AI 초안 (2026-07-18) — `@anthropic-ai/sdk` + `generateAiCommentDraft` 액션(`actions/reports/ai-comment.ts`), claude-opus-4-8 structured output(json_schema)으로 총평/잘한점/보완점/다음목표 4필드 생성. CommentStep "AI 초안 생성" 버튼은 `ANTHROPIC_API_KEY` 설정 시에만 노출(서버 판단), 초안 모드(강사 검토 후 저장·발송). 미설정 시 기능 자동 비활성 — **Vercel 환경변수에 `ANTHROPIC_API_KEY` 등록 필요**
- [ ] 상담 노트 요약 + 후속 액션 추출 — **보류 (2026-07-18, 사용자 결정: Claude API 추가 연동 보류)**
- [x] 위험 학생 조기 경보 (2026-07-18) — 규칙 기반 복합 스코어링 (AI 비용 없음). `lib/risk-score.ts` 순수 함수(`computeStudentRisk`, 단위테스트 8종): 최근 28일 vs 이전 28일 비교로 출석률 저조/하락·7일 공백·결석 누적·성적 10점+ 하락·평균 60 미만·미완료 과제를 합산, 5점+ 위험 / 3~4점 주의. `student-alerts` 위젯을 장기결석+과제부진 2분할 → 통합 위험 목록(사유 표시, 위험/주의 배지)으로 개편, quick-stats needsAttention도 연동
- [ ] 학부모 메시지 초안 생성 (초안 모드 — 반드시 사람 확인 후 발송) — **보류 (2026-07-18, 사용자 결정: Claude API 추가 연동 보류)**
- [ ] 성적 분석 내러티브 (성장 차트 자연어 해설) — **보류 (2026-07-18, 사용자 결정: Claude API 추가 연동 보류)**

## 문서-구현 정합화 (백로그)

- [ ] CLAUDE.md 파티셔닝 서술 수정 (미구현 — 1만 테넌트 시점 조건부 계획으로)
- [ ] CLAUDE.md UUID v7 서술 수정 또는 `uuid_generate_v7()` 도입 결정
- [ ] ENUM 5종 → ref 테이블 이관 결정 (`message_channel`, `messaging_provider` 우선)
- [ ] 중복 인덱스 정리 (단일 tenant_id vs 복합 선두부 중복)
- [ ] 에러 처리 스타일 `withServerAction` 래퍼로 점진 통일
- [ ] 거대 액션 파일 분할 (guardians 1,735줄 / textbooks 1,725줄 / exams 1,378줄)
