create table if not exists public.student_guardians (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  student_id             uuid not null references public.students(id) on delete cascade,
  guardian_id            uuid not null references public.guardians(id) on delete cascade,
  relation               text,                           -- 예: '모', '부'
  is_primary_contact     boolean not null default false, -- 주 보호자 여부 (primary contact)
  can_view_reports       boolean not null default true,  -- 성적 조회 권한
  receives_notifications boolean not null default true,  -- 일반 알림 수신
  receives_billing       boolean not null default false, -- 결제 관련 알림 수신
  can_pickup             boolean not null default true,  -- 하원 픽업 가능 여부
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  unique (student_id, guardian_id)
);

-- 인덱스
create index if not exists idx_sg_tenant_student on public.student_guardians(tenant_id, student_id);
create index if not exists idx_sg_guardian       on public.student_guardians(guardian_id);

-- 학생별 주 연락자 1명 제한 (선택적)
create unique index if not exists uq_sg_primary_contact_per_student
  on public.student_guardians(student_id)
  where is_primary_contact;
