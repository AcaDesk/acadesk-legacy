# Acadesk 종합 진단 리포트 & 로드맵

> 작성일: 2026-07-16
> 방법: 6개 영역(DB, 서버 액션/API, 기능·UX, 보안, Next.js/React 성능, 운영/DevEx) 병렬 코드베이스 감사 후 종합
> 진행 추적: 루트의 [TODO.md](../TODO.md)

## 총평 (TLDR)

Acadesk는 **핵심 학사 운영(학생·출결·성적·상담·리포트·알림)은 이미 국내 상위권 수준으로 성숙**해 있다. PWA 오프라인 출석, 키오스크 셀프 체크인, 벌크 리포트 위저드, 이벤트 알림톡 자동발송 같은 차별화 요소도 갖췄다. 그러나 지금 상태로 규모를 키우면 무너지는 지점이 명확히 4곳 있다:

1. **예약 발송이 크론 없이 "누군가 Jobs 페이지를 열어야" 실행됨** — `batch/jobs.ts:460`의 `runDueScheduledBatchJobs()`의 유일한 호출부가 `JobsContent.tsx:42`(페이지 마운트). 예약 알림톡/리포트가 조용히 미발송되는 구조적 결함. 학원 신뢰에 직결.
2. **수익화 인프라 제로** — 수납(학원→학생) 기능은 UI 껍데기(서버 액션 0개, mock 데이터), SaaS 과금(학원→Acadesk)은 테이블조차 없음. 가격 전략은 `internal/product/PricingStrategy.md` 문서로만 존재.
3. **운영 가시성 제로** — CI/CD 없음(`.github/` 부재, 문서에는 있다고 오기재), Sentry 전부 주석 처리(`src/lib/monitoring/error-reporter.ts`), 프로덕션 에러는 Vercel 콘솔 로그로만 소멸.
4. **키오스크 보안 구멍** — 브루트포스 방어 전무 + 테넌트 전체 학생 명부 노출 + 기본 PIN `1234` 폴백. 미성년자 PII를 다루는 제품에서 최우선 수정 대상.

또한 **문서(CLAUDE.md)와 실제 구현이 3곳에서 상반**된다: 파티셔닝(미구현), UUID v7(실제 v4), ENUM 지양(네이티브 ENUM 5종 사용). `payments`/`tuition_invoices`는 정의 마이그레이션이 없는데 대시보드 RPC가 참조하는 스키마 드리프트도 존재한다.

---

## 1. 기능 분석

### 성숙한 기능 (exists & works)

학생 관리(위저드·CSV 임포트·벌크·진급), 출결(PWA 오프라인·모바일 전용 뷰·결석자 일괄 연락), 성적(시험 템플릿·재시험·그리드 입력), 상담(리드 관리·후속 관리), 리포트(벌크 위저드·공유 링크·인쇄), 숙제/TODO(플래너·검증·템플릿), 키오스크(게이미피케이션·형제 처리), 알림톡 자동발송 9종.

### 우선순위별 추가/보완 기능

**Must (없으면 경쟁 탈락)**
- **수납/청구 실구현** — UI는 이미 존재(`create-invoices-dialog` 등), 백엔드만 없음. 테이블 정의 + 서버 액션 + 청구서 생성 + 납부 기록 + 미납 알림톡(`payment_overdue` 이벤트는 이미 정의됨). 학원 SaaS에서 수납은 출결 다음의 핵심 업무.
- **예약/자동 알림 스케줄러** — 이벤트 21종 중 12종(숙제 마감, 리포트 준비, 수납, 보강, 휴원 공지, 도서 반납 등)이 템플릿만 있고 발송 트리거 미배선. Vercel Cron 1개로 해결 가능.
- **주간 시간표 그리드** — `classes.schedule`이 자유형 JSON 필드로만 존재. 요일×시간 그리드 UI + 강의실 배정 + 시간 충돌 검사.

**Should (업무 시간 단축)**
- **전역 커맨드 팔레트(⌘K)** — `cmdk` 설치돼 있으나 미사용. 학생 이름 점프 + 빠른 액션만으로 강사 동선 대폭 단축.
- **보강/클리닉 관리** — `is_makeup_class` boolean과 `makeup_class_scheduled` 이벤트만 존재. 결석 발생 → 보강 일정 제안 → 보호자 알림 플로우.
- **학부모 포털(웹)** — `parentApp` 플래그만 존재. 앱 개발 전에 리포트 공유 링크(`/r/[linkId]`) 인프라를 확장한 조회 전용 웹 포털이 저비용 고효과.
- **온보딩 마법사** — 현재는 학원 기본정보 입력에서 종료. 학생 CSV → 반 생성 → 카카오 채널 연동까지 이어지는 체크리스트형 셋업.

**Could (차별화)**
- 입학 대기자(waitlist) 관리, 형제 할인 자동 적용(`InvoiceItemType.discount` 타입만 정의됨), 정기결제/자동청구, 성적표 표준 양식.

## 2. UX 분석

- **출석 체크: 이미 최적** — 학생당 1클릭 토글, 모바일 전용 뷰, 결석자 일괄 연락. 유일한 보완은 수백 명 로스터의 가상화(성능 항목).
- **성적 입력: 입력 UX는 우수하나 진입이 김** — Enter/Tab 이동 + Cmd+S + 자동저장은 좋지만 "시험을 먼저 만들어야" 입력 가능. "빠른 시험 생성 + 바로 입력" 단일 플로우로 1단계 축소 권장.
- **검색/필터 편차** — 학생·상담은 풍부, 보호자·교재·숙제 목록은 빈약. 공통 리스트 필터 패턴 통일 필요.
- **벌크 작업 편차** — 학생·리포트·재시험은 정교, 상담·보호자·숙제는 부재.
- **`tuitionManagement`가 inactive인데 메뉴에 노출**(`app-nav.tsx:125`) → 클릭하면 ComingSoon. 메뉴에서 숨기거나 "준비 중" 뱃지로 명시.
- **키보드 단축키가 성적 입력에만 존재** — 전역 단축키 체계 도입 여지.

## 3. 데이터베이스 분석

**양호**: tenant_id 선두 복합 인덱스 + `deleted_at IS NULL` 부분 인덱스 광범위 적용, trigram 검색 인덱스, FK 125개, 상태 컬럼의 `text + CHECK` 패턴.

**수정 필요 (우선순위순)**:
1. **스키마 드리프트**: `payments`·`tuition_invoices` 정의 마이그레이션 부재인데 대시보드 RPC(`20251003182442_update_dashboard_rpc_with_financials.sql`)가 참조 → 재무 위젯 런타임 오류 위험. `student_points` 계열도 seed-schema 누락. 스냅샷 재생성 필수.
2. **`class_enrollments (class_id, student_id)` 전역 UNIQUE** → 탈퇴(status=withdrawn) 후 동일 반 재등록 불가. `WHERE status='active'` 부분 유니크로 전환 + tenant_id 포함.
3. **`notification_logs.tenant_id` nullable + ON DELETE SET NULL** → 테넌트 격리 필터를 우회하는 고아 로그. NOT NULL + CASCADE로.
4. **`exam_scores` 범위 CHECK 없음**(percentage 0~100, score≥0) — `homework_submissions`·`textbook_progress`와 비일관.
5. **누락 인덱스**: `attendance(tenant_id, attendance_date)`, `class_enrollments(tenant_id, status)` 부분 인덱스, `students.kiosk_pin` 테넌트 내 유니크, `student_change_logs(changed_by)`.
6. **중복 인덱스 정리**: 단일 `tenant_id` 인덱스가 복합 인덱스 선두부와 겹치는 케이스 다수(예: `idx_exam_scores_tenant_id`) — 쓰기 비용만 증가.
7. **문서-구현 정합화**: UUID v4(문서는 v7), ENUM 5종(`message_category`, `message_channel`, `messaging_provider`, `notification_status`, `task_kind`), 파티셔닝 미구현. 파티셔닝은 현 규모에서 불필요하므로 문서를 수정하고 1만 테넌트 시점의 조건부 계획으로 남기는 것을 권장.
8. **비정규화 기회**: 대시보드 KPI가 매 요청 13개 쿼리 실시간 집계 + MV 전무 → `tenant_daily_stats` 집계 테이블(크론 갱신) 도입 시 대시보드 TTFB와 DB 부하 동시 해결.
9. `deleted_at` 누락 테이블: `class_enrollments`, `attendance`, `student_schedules`, `homework_submissions`, `book_lendings` 등 — 핵심 트랜잭션 테이블 위주로 검토.
10. `batch_drafts.created_by` 등 3곳이 `public.users`가 아닌 `auth.users`를 직접 FK 참조 — 사용자 모델 이원화.

## 4. API(서버 액션) 분석

- **커서 페이지네이션 전무, `.range()` 사용 5곳뿐.** 최악: `todos.ts:58`, `homeworks.ts:59`, `guardians.ts:328` — 무제한 + 무캐시 + PII 조인 전량 조회. `consultations.ts:114`의 `page/pageSize + count:'planned'` 패턴이 사내 모범 — 공통 유틸로 추출해 이식.
- **트랜잭션 제로**: `createStudentComplete`(`students/mutations.ts:31`)가 5단계 순차 INSERT(보호자 user → guardian → 학생 user → student → 연결) — 중간 실패 시 고아 레코드, 롤백 없음. 단일 SECURITY DEFINER RPC로 원자화가 최우선. `bulkDeleteStudents`, `createHomework`도 동일 문제.
- **N+1**: `batch/jobs.ts:261-305`가 아이템당 3회 이상 왕복(status 재조회 중복). `messaging/messages.ts:475`와 `reports/send.ts:733`은 외부 발송이 완전 직렬 — 동시성 제한(5~10) 병렬화로 대량 발송 시간 수 배 단축.
- **배치**: `students/bulk.ts:26 bulkUpdateStudents`가 N개 개별 UPDATE를 `Promise.all` — 단일 upsert로.
- **캐싱**: `unstable_cache` + 테넌트별 태그 무효화는 잘 정착. `getGuardiansWithDetails`, `getClassesWithDetails`(태그는 이미 무효화 중이라 캐시만 붙이면 됨)에 확대. `react cache()` 미사용 — 레이아웃/페이지 중복 조회 제거에 도입.
- **오버페치**: `select('*')` 약 40건. 특히 `messaging/config.ts:142,310,625`는 시크릿 컬럼까지 조회 후 마스킹 — 명시 컬럼으로.

## 5. Supabase 최적화

- **RLS**: 52개 테이블 enabled, 35개는 정책 없는 deny-all — service_role 패턴과 정확히 일치, 의도대로 정상(기존 결정 유지).
- **RPC**: 읽기 최적화용은 잘 활용 중(`search_students_list` 등). 쓰기 원자화 RPC 0개 — 트랜잭션 항목과 동일 처방.
- **Edge Function/크론**: 전무. 예약 배치는 Vercel Cron + `/api/cron/run-due-jobs`(Bearer 시크릿 검증)가 최소 비용 해법. pg_cron으로 `tenant_daily_stats` 갱신도 가능.
- **Realtime**: `in_app_notifications` 구독 정상 작동. 남용 없음.
- **Storage**: `student-profiles`가 공개 버킷 + 클라이언트 직접 업로드(현재 UI disabled). 활성화 전에 서명 URL + 서버 검증으로 전환 필요.

## 6~8. Next.js · React · UI 성능 (Lighthouse)

임팩트 순:

1. **폰트 9.9MB TTF** (`src/app/layout.tsx:15`) — Noto Sans KR variable TTF를 그대로 로드, woff2 없음, 서브셋 없음. woff2 + 한글 서브셋(또는 `next/font/google`)으로 90%+ 절감. **단일 변경으로 최대 LCP 효과.** Inter Tight 567KB도 동일.
2. **학생 목록 클라이언트 워터폴** — `getStudentsListEnriched`(`students/queries.ts:544`)가 limit 없이 전 학생을 마운트 후 페칭. 서버 프리페치 + `HydrationBoundary`(현재 사용처 0건)로 전환. classes/textbooks/library/consultations/reports 목록도 동일 패턴.
3. **대시보드가 단일 블로킹 페이로드** — `dashboard.ts:88-112`가 13개 쿼리를 한 덩어리 `unstable_cache`로 await. 코드 스플릿은 우수하나 데이터 스트리밍이 없어 가장 느린 쿼리가 첫 페인트를 지연. 위젯별 Suspense(async 위젯 패턴)로 전환.
4. **출석 로스터 가상화** — `attendance-check-page.tsx:119`가 전 학생 렌더. 수백 명 학원에서 입력 지연. 가상 스크롤 1순위 적용처.
5. **`StudentDetailClient.tsx:63` 컨텍스트 value 매 렌더 재생성** — 탭 전환마다 7개 탭 전체 리렌더. `useMemo` 한 줄.
6. **exceljs 정적 임포트** → `import('exceljs')` 지연 로드. `react-big-calendar`는 import 0건인 데드 의존성 — 제거.
7. **`error.tsx`가 attendance 1곳뿐, `global-error.tsx` 없음** — 주요 라우트 확충.
8. **CLS**: 제네릭 스켈레톤이 실제 표 치수와 불일치 — 치수 정합화.
9. `students/page.tsx:43`의 Suspense가 non-suspense useQuery를 감싸 무효 — 정리.
10. react-grid-layout 편집 UI `dynamic(ssr:false)` 분리.

## 9. 보안 (OWASP)

**긍정**: XSS 위험 낮음(React 이스케이프, `dangerouslySetInnerHTML` 1곳은 개발자 제어값), service-role 클라이언트 노출 없음, `verifyStaff` 계열 스푸핑 불가, 미결이었던 approve-user 인가는 이미 `verifyPlatformAdmin`으로 해결 확인(`approve-user.ts:52,141`).

| 심각도 | 발견 | 처방 |
|---|---|---|
| High | 키오스크 브루트포스 방어 전무 — 4자리 PIN/전화 뒷자리, 시도 제한 없음, 디바이스 토큰 1년 유효 (`kiosk.ts:62,334`) | IP·디바이스 단위 레이트리밋 + 잠금 |
| High | `getStudentsByTenant`(`kiosk.ts:286`)가 디바이스 토큰만으로 테넌트 전체 학생 명부(이름·사진) 반환 | 검색 기반 최소 응답으로 축소 |
| High | 보호자 전화 미등록 학생은 PIN `1234` 폴백 인증(`kiosk.ts:386-401`) | 폴백 제거 |
| Medium | `awardStudentPoints`(`student-points.ts:193`), `createConsultation`(`consultations.ts:422`)에 학생 소유권 검증 누락 | `filterOwnedStudentIds` 적용 |
| Medium | 미들웨어에 역할/관리자 심층방어 없음 — 페이지 인라인 체크가 단일 방어선 | `/admin` 레이아웃 레벨 가드 |
| Low/Med | `/short`·`/s` 오픈 리다이렉트(`target_url` 출처 미검증) + GET 상태변경 | 도메인 화이트리스트 |
| Low | `getCurrentTenantId`(`helpers.ts:50`)에 `deleted_at` 필터 누락(비일관) | 필터 추가 |

## 10. 운영

현재 상태: CI/CD 없음, e2e 0개(playwright config조차 없음), Sentry 주석 처리, 제품 분석 도구 전무, 관리자 감사 로그 없음(`student_activity_logs`는 도메인 로그), PITR/RPO/RTO 미정의, SaaS 빌링·사용량 제한 없음, 피처 플래그 정적 파일(재배포 필요·테넌트별 불가·킬스위치 불가), husky/prettier/commitlint 없음, `/api/health` 없음.

즉시 도입(투자 대비 효과순): ① GitHub Actions 워크플로 ② Vercel Cron으로 예약 배치 서버 트리거화 ③ Sentry 실연동(스텁이 이미 있어 저비용) ④ PITR 활성화 + RPO/RTO 문서화 ⑤ `admin_audit_logs` 테이블 ⑥ 피처 플래그 DB화(테넌트별 override).

## 11. AI 기능 (차별화)

`aiAnalytics` 플래그가 이미 예약돼 있고, 데이터가 이미 쌓이는 도메인부터:

1. **리포트 코멘트 AI 초안** — 리포트 stepper에 CommentStep 존재, `collectReportMetricsByStudent`가 출결·과제·성적 데이터를 이미 수집. 강사 리포트 작성 시간이 가장 큰 업무 부담이므로 ROI 최대.
2. **상담 노트 요약 + 후속 액션 추출** — 상담 도메인에 노트·후속 관리가 이미 있어 자연 결합.
3. **위험 학생 조기 경보** — 출결 패턴 변화 + 성적 하락 + 과제 미제출 결합 이탈 위험 스코어. `student-alerts` 위젯이 표시 지면.
4. **학부모 메시지 초안 생성** — 알림톡 인프라 위에 상황별 맞춤 문구.
5. **성적 분석 내러티브** — 성장 차트에 자연어 해설 추가.

구현은 Claude API + 서버 액션으로 충분. 학부모 발송물은 반드시 사람 확인 후 발송(초안 모드)으로 설계.

## 12. 확장성

- **~100 학원**: 현 구조로 무리 없음. 단 무제한 쿼리(todos/guardians)와 9.9MB 폰트는 지금도 아픔.
- **~1,000 학원**: 페이지네이션 표준화 + KPI 집계 테이블 + 배치 병렬화가 전제. 발송 볼륨 증가로 큐(pg 기반 job queue 또는 QStash) 필요.
- **~10,000 학원**: `attendance`·`notification_logs` 월별 파티셔닝(이 시점에 문서의 약속을 실제 이행), 읽기 복제본, 발송 전용 워커 분리. 현 테넌트-필터 아키텍처 자체는 이 규모까지 유효 — 병목은 스키마가 아니라 운영 요소.

## 13. 코드 품질

구조(도메인별 액션/features 폴더/훅 위치)는 이미 일관되고 좋음. 실제 부채:

- **에러 처리 2중 스타일**: `withServerAction` 래퍼 vs 레거시 직접 try/catch 혼재, 반환 형태 불일치 → 래퍼로 점진 통일.
- **거대 파일**: `guardians.ts` 1,735줄, `textbooks.ts` 1,725줄, `grades/exams.ts` 1,378줄 → students처럼 queries/mutations 분할.
- **페이지네이션 공통 유틸 부재** → consultations 패턴 추출.
- **쓰기 원자성은 코드가 아니라 DB(RPC)로** — 애플리케이션 보상 로직보다 Postgres 함수가 정답.
- Clean Architecture 전면 도입은 **비권장** — 현 "서버 액션 = 유스케이스" 구조가 이 규모에 적정.

## 14. 개발 생산성

1. **GitHub Actions**: PR마다 `type-check + lint + test:run + build`.
2. **husky + lint-staged**: pre-commit 변경 파일 검사.
3. **Playwright 실구성**: config + 핵심 4 시나리오(로그인→출석→성적 입력→메시지 발송). e2e 0개인 현재가 가장 큰 회귀 리스크.
4. **RLS/테넌트 격리 회귀 테스트**: 두 테넌트 시드 후 교차 접근 전부 실패 검증 vitest 스위트.
5. Prettier + commitlint(한국어 컨벤션). Storybook·Changesets는 현 단계 불필요.

---

## 15. 우선순위 로드맵

### Phase 1 — 필수: 신뢰와 안정 (약 3~4주)

| 항목 | 기대 효과 | 난이도 | 기간 | ROI |
|---|---|---|---|---|
| Vercel Cron + 예약 배치 서버 트리거화 | 예약 알림톡/리포트 미발송 사고 원천 차단 | 하 | 2일 | ★★★★★ |
| 키오스크 보안 3종(레이트리밋·명부 축소·PIN 폴백 제거) | 미성년자 PII 유출 리스크 제거 | 중 | 3일 | ★★★★★ |
| GitHub Actions CI + husky | 무검증 배포 차단 | 하 | 1일 | ★★★★★ |
| Sentry 실연동 + error.tsx 확충 | 장애 인지 시간 수 시간→수 분 | 하 | 1일 | ★★★★★ |
| 폰트 woff2 서브셋 전환 | 전 페이지 LCP 대폭 개선 | 하 | 반나절 | ★★★★★ |
| 스키마 드리프트 해소 + DB 제약 4종 | 재무 위젯 오류 방지, 재등록 버그 예방 | 중 | 3일 | ★★★★ |
| 소유권 검증 2건 | 크로스테넌트 참조 오염 차단 | 하 | 반나절 | ★★★★ |
| PITR 활성화 + RPO/RTO 문서화 | 데이터 손실 복구 보장 | 하 | 1일 | ★★★★ |

### Phase 2 — 중요: 수익화와 성능 (약 6~8주)

| 항목 | 기대 효과 | 난이도 | 기간 | ROI |
|---|---|---|---|---|
| 수납/청구 백엔드 실구현 | 최대 기능 공백 해소, 유료 전환 근거 | 상 | 3주 | ★★★★★ |
| 미배선 알림 12종 크론 연결 | "설정했는데 안 오는" 신뢰 손상 제거 | 중 | 1주 | ★★★★ |
| 쓰기 RPC 원자화(createStudentComplete 등) | 고아 레코드 근절 | 중 | 1주 | ★★★★ |
| 페이지네이션 표준화(todos/homeworks/guardians) | 학원 규모 성장 시 응답 시간 유지 | 중 | 1주 | ★★★★ |
| 발송 병렬화 + 자동 재시도 | 대량 발송 시간 수 배 단축 | 중 | 4일 | ★★★★ |
| 목록 SSR 프리페치 + 출석 로스터 가상화 | 일상 화면 체감 속도 | 중 | 1주 | ★★★ |
| Playwright e2e + 테넌트 격리 회귀 테스트 | 회귀 사고 방지 안전망 | 중 | 1주 | ★★★★ |

### Phase 3 — 고도화: 경쟁 우위 (약 8~10주)

| 항목 | 기대 효과 | 난이도 | 기간 | ROI |
|---|---|---|---|---|
| 주간 시간표 그리드(충돌 검사·강의실) | 학기 세팅 시간 대폭 단축 | 상 | 3주 | ★★★★ |
| 학부모 웹 포털(조회 전용) | 학부모 만족도, 앱 대비 1/5 비용 | 상 | 3주 | ★★★★ |
| SaaS 빌링 + 플랜 게이팅 | 수익화 개시, 남용 방지 | 상 | 2주 | ★★★★★ |
| 전역 커맨드 팔레트(⌘K) | 강사 일상 동선 클릭 수 절감 | 중 | 1주 | ★★★ |
| 보강/클리닉 + 대기자 관리 | 결석→보강 자동 플로우 | 중 | 2주 | ★★★ |
| 대시보드 스트리밍 + KPI 집계 테이블 | 첫 화면 즉시 페인트, DB 부하 감소 | 중 | 1주 | ★★★ |
| 감사 로그 + 플래그 DB화 + 제품 분석 | 운영 성숙도, 데이터 기반 의사결정 | 중 | 2주 | ★★★ |

### Phase 4 — AI 혁신 (약 8주, Phase 2~3과 병행 가능)

| 항목 | 기대 효과 | 난이도 | 기간 | ROI |
|---|---|---|---|---|
| 리포트 코멘트 AI 초안 | 강사 리포트 작성 시간 70%↓ | 중 | 2주 | ★★★★★ |
| 상담 요약 + 후속 액션 추출 | 상담 기록 부담 절감 | 중 | 1주 | ★★★★ |
| 위험 학생 조기 경보 | 퇴원(이탈) 사전 감지 — 매출 직결 | 상 | 3주 | ★★★★★ |
| 학부모 메시지 초안 생성 | 소통 품질 상향 평준화 | 하 | 1주 | ★★★ |
| 성적 분석 내러티브 | 리포트 설득력 강화 | 하 | 1주 | ★★★ |

**원칙**: Phase 1은 기능 추가가 아니라 "이미 약속한 것이 실제로 동작하고, 사고 나면 알 수 있는 상태" 만들기. 수납(Phase 2)과 위험 학생 경보·리포트 AI(Phase 4)가 사용자 업무 시간과 매출에 가장 직결되는 투자이고, 시간표·학부모 포털(Phase 3)이 경쟁 우위를 완성한다.
