-- 20260207000001_extend_attendance_columns.sql
-- 출석 테이블 확장: 사유, 자습, 보강, 지각/조퇴 시간 컬럼 추가

-- ============================================================
-- 1. attendance 테이블 컬럼 추가
-- ============================================================

-- 사유 (결석/지각 사유)
alter table public.attendance
  add column if not exists reason text;

-- 자습 여부
alter table public.attendance
  add column if not exists is_self_study boolean default false;

-- 보강 수업 여부
alter table public.attendance
  add column if not exists is_makeup_class boolean default false;

-- 지각 시간 (분 단위)
alter table public.attendance
  add column if not exists late_minutes integer;

-- 조퇴 시간 (분 단위)
alter table public.attendance
  add column if not exists early_leave_minutes integer;

-- ============================================================
-- 2. 컬럼 코멘트 추가
-- ============================================================

comment on column public.attendance.reason is '결석/지각/조퇴 사유';
comment on column public.attendance.is_self_study is '자습 여부';
comment on column public.attendance.is_makeup_class is '보강 수업 여부';
comment on column public.attendance.late_minutes is '지각 시간 (분)';
comment on column public.attendance.early_leave_minutes is '조퇴 시간 (분)';

-- ============================================================
-- 3. 출석 상태 체크 제약 조건 업데이트 (left_early 추가)
-- ============================================================

-- 기존 제약 조건 삭제 (있는 경우)
alter table public.attendance
  drop constraint if exists attendance_status_check;

-- 새 제약 조건 추가 (left_early 포함)
alter table public.attendance
  add constraint attendance_status_check
  check (status in ('present', 'late', 'absent', 'excused', 'left_early'));
