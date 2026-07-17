# 백업 / 복구 운영 문서

> **작성일**: 2026-07-17
> **대상**: DB 백업 정책, RPO/RTO 정의, 복구 런북
> **관련**: [internal/tech/Architecture.md](../internal/tech/Architecture.md), [TODO.md](../TODO.md)

학원 관리 SaaS 특성상 출결·성적 데이터는 재입력 비용이 크다. 이 문서는 데이터 손실 시나리오에 대비한 백업 정책과 복구 절차를 정의한다.

---

## 1. 현재 상태 (2026-07-17 기준)

- **DB**: Supabase 프로젝트 `AcaDesk-Web` (ref: `mzftcusxsvwbzobmlwpm`, Seoul 리전)
- **백업 방식**: Supabase 기본 **Daily Snapshot**에 의존 중
  - ⚠️ **PITR(Point-in-Time Recovery) 활성화 여부 미확인** — 대시보드 **Database → Backups**에서 확인 필요
- **마이그레이션**: `supabase/migrations/`로 git 추적, `supabase db push`로 적용
  - 2026-07-17 로컬·원격 히스토리 정합 완료
- **코드/설정**: GitHub(main) + Vercel 배포이므로 별도 백업 불필요

---

## 2. 목표 RPO / RTO

> **RPO** (Recovery Point Objective): 허용 가능한 최대 데이터 손실 시간
> **RTO** (Recovery Time Objective): 장애 발생부터 복구 완료까지 허용 시간

제안값 (학원 관리 SaaS 특성 반영):

| 백업 방식 | RPO | RTO | 비고 |
|-----------|-----|-----|------|
| **PITR 활성화 시** | ≤ 2분 (WAL 기반) | ≤ 1시간 | 권장 |
| **Daily Snapshot만** | ≤ 24시간 | ≤ 4시간 | 현재 상태(추정) |

Daily Snapshot만 운영 시 최대 24시간치 데이터가 손실될 수 있으며, 이는 **하루치 출결·성적 재입력**을 의미한다. 출결·성적 데이터의 재입력 비용을 고려하면 **PITR 활성화를 강력히 권장**한다.

---

## 3. 설정 체크리스트

- [ ] **PITR 활성화** — Supabase Dashboard → **Project Settings → Add-ons**에서 PITR 활성화
  - Pro 플랜 필요, 보존 기간 **7일** 권장
- [ ] **분기 1회 복구 리허설** — 스냅샷을 새 프로젝트로 복원 후 핵심 테이블 로우 카운트 대조
  - 대상 테이블: `students`, `attendance`, `exam_scores`
- [ ] **Storage 버킷 백업 전략** — `student-profiles` 등 Storage 버킷은 **DB 백업에 포함되지 않음**
  - 파일 자산이 증가하면 별도 백업 전략 필요 (예: 버킷 정기 export)

---

## 4. 복구 런북

### 4.1 데이터 오염 / 실수 삭제 시

1. Supabase Dashboard → **Database → Backups**
2. **PITR로 오염 직전 시각으로 복원** (Backups → Restore)
   - Daily Snapshot만 있는 경우 가장 가까운 스냅샷 시점으로만 복원 가능

### 4.2 복원 단위 주의 — 프로젝트 전체 단위

Supabase 복원은 **프로젝트 전체 단위**로 동작한다. **특정 테이블만 복원할 수 없다.**

일부 테이블/로우만 되돌리고 싶을 때는 다음 우회 절차를 사용한다:

1. 스냅샷 또는 PITR 시점을 **새 프로젝트**로 복원 (원본은 그대로 유지)
2. 복원된 프로젝트에서 필요한 데이터만 `pg_dump`로 추출
   ```bash
   # 예: 특정 테이블만 데이터 덤프 (--data-only)
   pg_dump "postgresql://<복원된_프로젝트_연결문자열>" \
     --data-only --table=public.attendance \
     > attendance_recovered.sql
   ```
3. 원본 프로젝트에 재주입 (충돌 방지를 위해 대상 로우 범위를 좁혀서 적용)

### 4.3 복구 중 애플리케이션 동작

- **Vercel 앱은 그대로 둔다** (다운타임 최소화).
- 단, 복구 완료 전까지 **배치 크론(`/api/cron/run-due-jobs`)이 오발송**할 수 있다 (예: 복구 중 불완전한 상태로 알림 발송).
- 크론을 일시 차단하려면 **Vercel에서 `CRON_SECRET` 환경변수를 임시 제거**한다.
  - 크론 라우트가 시크릿 불일치로 **503**을 반환해 실행이 막힌다.
  - 복구 완료 후 `CRON_SECRET`을 원복하고 재배포한다.

---

## 5. 관련 문서

- [internal/tech/Architecture.md](../internal/tech/Architecture.md) — 시스템 아키텍처, 배포 구조
- [TODO.md](../TODO.md) — 백업/복구 관련 작업 항목
