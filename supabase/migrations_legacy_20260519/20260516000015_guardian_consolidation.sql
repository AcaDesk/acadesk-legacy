-- 보호자 데이터 정합성 강화
--
-- 배경: 동일 전화번호로 보호자가 중복 생성되어 형제자매 자동 인식이 깨지는 문제.
-- searchGuardians가 role_code='guardian'으로 검색했으나 실제 데이터는 'parent'로 저장되어
-- 검색 미스매치 → 사용자가 모르고 동일 보호자를 매번 새로 등록한 결과.
--
-- 본 마이그레이션은:
--   1) guardians.{phone,email}을 users에서 backfill (단일 출처 전환 준비)
--   2) 동일 (tenant, normalized_phone, lower(name)) 그룹 자동 머지
--   3) normalized_phone GENERATED 컬럼 + partial UNIQUE 인덱스 추가

-- ---------------------------------------------------------------------------
-- 1. 전화번호 정규화 함수
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) >= 9
      then regexp_replace(p, '\D', '', 'g')
    else null
  end
$$;

comment on function public.normalize_phone(text) is
  '전화번호에서 숫자만 추출 (9자리 이상일 때만 반환, 그 외 null)';

-- ---------------------------------------------------------------------------
-- 2. guardians.{phone,email} backfill (users에서 보충)
-- ---------------------------------------------------------------------------
update public.guardians g
set
  phone = coalesce(g.phone, u.phone),
  email = coalesce(g.email, u.email),
  updated_at = now()
from public.users u
where g.user_id = u.id
  and g.deleted_at is null
  and (
    (g.phone is null and u.phone is not null) or
    (g.email is null and u.email is not null)
  );

-- ---------------------------------------------------------------------------
-- 3. 동일 (tenant, normalized_phone, lower(name)) 보호자 자동 머지
--
-- 정책 (운영자 합의):
--   - 정규화된 전화번호 + 이름(소문자, trim 아님)이 모두 같으면 동일 보호자로 간주
--   - canonical: (연결 학생 수 ↓, 생성일 ↑) 순으로 1순위 선정
--   - 나머지의 student_guardians는 canonical로 이관 후 soft-delete
--   - canonical에 동일 (student_id, guardian_id) 쌍이 이미 있으면 신규 insert 생략
--   - 보호자 레코드 자체도 soft-delete (users는 유지: 다른 도메인 참조 가능성)
-- ---------------------------------------------------------------------------

-- 3-1. 머지 계획을 임시 테이블에 stage (한 번만 계산해서 일관성 보장)
create temporary table _guardian_merge_plan on commit drop as
with normalized as (
  select
    g.id, g.tenant_id, g.user_id, g.name, g.created_at,
    public.normalize_phone(coalesce(g.phone, u.phone)) as np,
    (select count(*) from public.student_guardians sg
       where sg.guardian_id = g.id and sg.deleted_at is null) as link_cnt
  from public.guardians g
  left join public.users u on u.id = g.user_id
  where g.deleted_at is null
),
ranked as (
  select *,
    row_number() over (
      partition by tenant_id, np, lower(name)
      order by link_cnt desc, created_at asc
    ) as rn,
    first_value(id) over (
      partition by tenant_id, np, lower(name)
      order by link_cnt desc, created_at asc
      rows between unbounded preceding and unbounded following
    ) as canonical_id
  from normalized
  where np is not null
)
select id as duplicate_id, canonical_id
from ranked
where rn > 1;

-- 3-2. student_guardians 이관: canonical에 동일 학생 연결이 없는 경우만 신규 insert
insert into public.student_guardians (
  tenant_id, student_id, guardian_id, relation,
  is_primary, is_primary_contact, can_view_reports,
  receives_notifications, receives_billing, can_pickup
)
select distinct on (sg.student_id, p.canonical_id)
  sg.tenant_id,
  sg.student_id,
  p.canonical_id,
  sg.relation,
  -- canonical에 이미 primary가 있으면 신규는 false로 강제
  case when exists (
    select 1 from public.student_guardians existing
    where existing.student_id = sg.student_id
      and existing.is_primary = true
      and existing.deleted_at is null
  ) then false else coalesce(sg.is_primary, false) end as is_primary,
  case when exists (
    select 1 from public.student_guardians existing
    where existing.student_id = sg.student_id
      and existing.is_primary_contact = true
      and existing.deleted_at is null
  ) then false else coalesce(sg.is_primary_contact, false) end as is_primary_contact,
  sg.can_view_reports,
  sg.receives_notifications,
  sg.receives_billing,
  sg.can_pickup
from _guardian_merge_plan p
join public.student_guardians sg
  on sg.guardian_id = p.duplicate_id
 and sg.deleted_at is null
where not exists (
  select 1 from public.student_guardians existing
  where existing.tenant_id = sg.tenant_id
    and existing.student_id = sg.student_id
    and existing.guardian_id = p.canonical_id
)
on conflict (student_id, guardian_id) do update
  set deleted_at = null,
      updated_at = now();

-- 3-3. 머지된 보호자의 student_guardians 모두 soft-delete
update public.student_guardians sg
set deleted_at = now(), updated_at = now()
where sg.guardian_id in (select duplicate_id from _guardian_merge_plan)
  and sg.deleted_at is null;

-- 3-4. 머지된 guardians 레코드 soft-delete
update public.guardians g
set deleted_at = now(), updated_at = now()
where g.id in (select duplicate_id from _guardian_merge_plan)
  and g.deleted_at is null;

-- ---------------------------------------------------------------------------
-- 4. normalized_phone GENERATED 컬럼
-- ---------------------------------------------------------------------------
alter table public.guardians
  add column if not exists normalized_phone text
    generated always as (public.normalize_phone(phone)) stored;

create index if not exists idx_guardians_tenant_norm_phone
  on public.guardians (tenant_id, normalized_phone)
  where deleted_at is null and normalized_phone is not null;

-- ---------------------------------------------------------------------------
-- 5. UNIQUE 인덱스: (tenant_id, normalized_phone, lower(name))
--    부/모가 같은 번호를 공유하는 경우(이름 다름)는 통과
--    동일 인물의 중복 등록은 차단
-- ---------------------------------------------------------------------------
create unique index if not exists uq_guardians_tenant_phone_name_active
  on public.guardians (tenant_id, normalized_phone, lower(name))
  where deleted_at is null and normalized_phone is not null;

comment on index public.uq_guardians_tenant_phone_name_active is
  '동일 테넌트 내에서 (정규화 전화번호 + 이름 소문자) 조합은 활성 보호자 1명만 허용';
