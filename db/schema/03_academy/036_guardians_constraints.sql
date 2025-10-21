-- 무결성 제약: 학생-보호자-연계 동일 테넌트 강제 (트리거 미사용)
set search_path = public;

-- 1) (id, tenant_id) UNIQUE 제약 추가: students, guardians, users
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'uq_students_id_tenant') then
    alter table public.students add constraint uq_students_id_tenant unique (id, tenant_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'uq_guardians_id_tenant') then
    alter table public.guardians add constraint uq_guardians_id_tenant unique (id, tenant_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'uq_users_id_tenant') then
    alter table public.users add constraint uq_users_id_tenant unique (id, tenant_id);
  end if;
end $$;

-- 2) student_guardians 복합 FK로 동일 테넌트 보장
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_sg_student_same_tenant') then
    alter table public.student_guardians
      add constraint fk_sg_student_same_tenant
      foreign key (student_id, tenant_id)
      references public.students(id, tenant_id)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fk_sg_guardian_same_tenant') then
    alter table public.student_guardians
      add constraint fk_sg_guardian_same_tenant
      foreign key (guardian_id, tenant_id)
      references public.guardians(id, tenant_id)
      on delete cascade;
  end if;
end $$;

-- 3) guardians.user_id ↔ users.tenant_id 동일 테넌트 보장 (user_id NULL 허용)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_guardian_user_same_tenant') then
    alter table public.guardians
      add constraint fk_guardian_user_same_tenant
      foreign key (user_id, tenant_id)
      references public.users(id, tenant_id)
      on delete set null;
  end if;
end $$;

