# ERD

# **0) 결정 원칙(최종 고정안)**

1. **멀티테넌시 격리**: 모든 테이블 tenant_id 포함, 주요 UK/인덱스에 tenant_id 동반.
2. **ID 전략**: **UUID v7**(시간 정렬) + 내부적으로는 단일 PK, 쿼리/UK에서는 (tenant_id, …)로 스코프.
3. **시간/이력**: created_at/updated_at/deleted_at + 필요 테이블은 effective_start/end(기간), 변경 이력은 *_history.
4. **ENUM 금지**: 모든 분류는 **코드 테이블**(전역 ref_code + 테넌트 오버레이 tenant_code).
5. **PII 분리/암호화**: *_pii 별도, pgcrypto(암호화) + RLS, 읽기는 **SECURITY DEFINER 뷰/함수**만.
6. **출석은 ‘세션 귀속’**: rule→session 전개 후 attendance.session_id에 귀속 + scheduled_starts_at **denorm**.
7. **확장 메타**: 주요 엔티티 meta jsonb + (선택) json_schema_id. 메타 키는 **허용 키 화이트리스트**로 검증.
8. **아웃박스/감사 표준화**: domain_event(멱등키/재시도) + audit_log(전/후 스냅샷).
9. **시간대**: DB 전부 **UTC timestamptz**, 표시 시 tenant.timezone.
10. **금액/수량 타입**: 금액은 **BIGINT(원 단위)**, 점수는 **NUMERIC(5,2)**, 퍼센트는 **NUMERIC(5,2)** 0~100 **CHECK**.

---

# **1) 코드·정책(DDL 없이 바꾸는 핵심)**

## **1.1 코드 테이블(전역 + 테넌트 오버레이)**

```
create table ref_code_type(code_type text primary key, label text);

create table ref_code(
  code_type text references ref_code_type(code_type),
  code text,
  label text,
  sort int default 0,
  active boolean default true,
  primary key (code_type, code)
);

create table tenant_code(
  tenant_id uuid,
  code_type text,
  code text,
  label text,
  sort int default 0,
  active boolean default true,
  primary key (tenant_id, code_type, code)
);
-- 조회 규칙: 있으면 tenant_code, 없으면 ref_code (뷰/함수로 캡슐화)
```

## **1.2 정책(지각 기준·쿨다운·조용시간 등)**

```
create table policy_rule(
  rule_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  rule jsonb not null,               -- {"late_minutes":10,"quiet_hours":[22,7],...}
  effective_start timestamptz,
  effective_end timestamptz
);
```

> 장점
> 
> 
> **데이터만 수정**
> 

---

# **2) 데이터 타입·정규화(깐깐하게)**

- **이메일**: citext(대소문자 무시) + 포맷 CHECK.
- **전화**: text + **E.164** 패턴 CHECK(^\+[1-9]\d{1,14}$).
- **이름 검색**: pg_trgm(삼그램) 인덱스 사용.
- **통화**: 현재 KRW만이라도, 컬럼은 amount_won bigint로 설계(환율/멀티통화 확장 시 별도 테이블 추가만).
- **고유 키(비즈니스 키)**: student_code, class_code, barcode 등은 **UK(tenant 범위)**로 보조.

예)

```
alter table guardian_pii add constraint phone_e164_ck
  check (phone_e164 ~ '^\+[1-9]\d{1,14}$');
create extension if not exists citext;
alter table user_profiles alter column email type citext;
```

---

# **3) 참조 무결성(ON DELETE 정책 명확화)**

- **강제 CASCADE**
    - class_session → attendance, assessment_instance(session)
    - lib_copy → lib_loan (복사본 삭제 시 대여도 불가, 실무에선 삭제 대신 비활성 권장)
- **RESTRICT/SET NULL**
    - student 삭제는 **soft delete**만(데이터 보존).
    - teacher 비활성 시 verified_by는 유지(참조 무결 위해 별도 teacher_id FK는 **SET NULL** 가능).

예)

```
alter table attendance
  add constraint fk_att_sess foreign key (session_id)
  references class_session(session_id) on delete cascade;
```

---

# **4) 시간 무결성(기간·중복·경계)**

- **등록 겹침 방지**: enrollment에 tstzrange + btree_gist **EXCLUDE**(이미 제안했음).
- **세션 경계**: class_session은 반드시 school_term 범위 내 **CHECK**.
- **반복 규칙 전개**: class_schedule_rule + holiday를 반영해 **미리 전개**(N주치) + 변경 시 **증분 수정**.

예)

```
alter table class_session add constraint sess_in_term_ck
  check (starts_at >= (select start_date from school_term st where st.term_id=class_session.term_id)
     and ends_at   <= (select end_date   from school_term st where st.term_id=class_session.term_id));
```

---

# **5) 파생/비정규화(성능을 위한 최소 Denorm)**

- attendance.scheduled_starts_at **denorm**(지각 계산 조인 제거).
- assessment_attempt.taken_at ← instance.date **복사**(월/주 집계 가속).
- student_current_status **물질화 뷰**: 최근 출석/평균/투두 완료율 등 대시보드용.

예)

```
create materialized view mv_student_current as
select
  s.tenant_id, s.student_id,
  (select avg(score) from assessment_attempt a
    where a.student_id=s.student_id and a.deleted_at is null
    and a.taken_at >= now() - interval '30 days') as avg30_score,
  (select coalesce(avg(case when status_code='COMPLETED' then 100 else 0 end),0)
   from task_assignment ta
   where ta.student_id=s.student_id and ta.assigned_date >= current_date - 30) as todo_30d_rate
from student s
where s.deleted_at is null;
```

---

# **6) 파티셔닝·인덱스(오래 버틸 물리 설계)**

- **월 파티션**: attendance, assessment_attempt, class_session, notif_message/delivery
    - period_month date generated always as (date_trunc('month', ts)::date)
    - 파티션 자동 생성 함수 + 크론(매월 25일) 구동.
- **커버링/부분 인덱스**
    - 출석 현황: (tenant_id, session_id) include (status_code, check_in_at)
    - 학생 검색: (tenant_id, name) + gin(name gin_trgm_ops)
    - 소프트 삭제: … where deleted_at is null

---

# **7) RLS 고급 패턴(유지보수 쉬운 형태)**

- **정책 함수화**

```
create or replace function fn_same_tenant(tid uuid)
returns boolean language sql stable as
$$ select tid = (auth.jwt()->>'tenant_id')::uuid $$;
```

- 모든 정책 using(fn_same_tenant(tenant_id))로 통일 → 정책 수정 시 한 곳만 변경.
- **PII는 뷰/함수로만**:

```
create or replace function fn_get_guardian_phone(gid uuid)
returns text security definer language sql as
$$
  select case when (auth.jwt()->>'role')='OWNER'
    then phone_e164 else null end
  from guardian_pii where guardian_id=gid;
$$;
```

---

# **8) 알림/아웃박스(멱등·재시도)**

- notif_message(idempotency_key unique, cooldown_key index)
- domain_event에 hash(body) + dedupe_key
- 재시도 정책: retry_count, next_retry_at, 지수 백오프.

예)

```
create unique index notif_idem_uq on notif_message(tenant_id, idempotency_key);
create index notif_cooldown_idx on notif_message(tenant_id, cooldown_key);
```

---

# **9) 사용량·과금 훅(미리 박아두기)**

- usage_daily(tenant_id, ymd, metric, value) / usage_monthly(tenant_id, ym, metric, value)
- 쓰기 경로 트리거로 **증분 카운트**(예: 메시지 발송, PDF 생성, 학생 신규).
- 게이트: API/Edge에서 플랜별 한도 초과 시 **즉시 차단** + 알림.

---

# **10) 메타(jsonb) 검증(스키마 없이 안전하게)**

- meta_allowed_key(entity, key) 테이블을 두고, BEFORE INSERT/UPDATE 트리거에서
    
    jsonb_object_keys(new.meta) ⊆ (허용 키 집합) **검증**.
    
- 값 타입 검증은 policy_rule/ref_code와 조합(필요 시 애플리케이션 레벨 추가검증).

예)

```
create table meta_allowed_key(
  entity text,     -- 'student','material'...
  key text,
  primary key (entity, key)
);
-- 트리거에서 모든 key가 허용 목록에 속하는지 체크
```

---

# **11) 마이그레이션·릴리스(무중단·뒤호환)**

- **2-Phase 컬럼 추가**: NULLABLE 추가 → 읽기 경로 반영 → 쓰기 경로 전환 → NOT NULL + DEFAULT → 구 컬럼 제거.
- **Feature Flag**: feature_flag(tenant_id, key, on)로 테넌트 단계적 롤아웃.
- **백필**: 큰 테이블은 **배치 + 작은 청크**(id 범위/기간별)로 진행.

---

# **12) 무결성 테스트 세트(야간 배치로 자동 점검)**

- 고아 FK: select … left join … where child.fk is null → **0행**이어야.
- 기간 역전: starts_at >= ends_at → **0행**.
- 중복 대여: lib_loan where returned_at is null group by copy_id having count(*)>1 → **0행**.
- 출석 중복: attendance unique(tenant_id, session_id, student_id) 위반 탐지 → **0행**.
- PII 접근 로그: audit_log where table in ('*_pii') **있는지** + 액터 권한 검증.

---

# **13) 도메인 축 미니 ERD(재확인)**

### **출석/일정**

```
CLASS ─ RULE ─▶ SESSION ─▶ ATTENDANCE ─▶ (VIEW: LATE_MINUTES)
        ▲          ▲
     HOLIDAY   ENROLLMENT(겹침방지)
```

### **평가/리포트**

```
ASSESSMENT_DEF ─▶ INSTANCE ─▶ ATTEMPT
                         │
                    REPORT_RUN(불변)
```

### **투두/기기**

```
TASK ─▶ TASK_ASSIGNMENT ─(학생)─▶ DEVICE_ASSIGNMENT ─(정책)─▶ DEVICE_POLICY
```

---

## **결론(요지)**

- **코드·정책·메타·아웃박스**로 “요구 변화”의 대부분을 **데이터 변경**으로 흡수한다.
- **시간/무결성·RLS·파티셔닝**으로 “운영 내구성”을 확보한다.
- 이대로 가면 **추가·수정 공수 최소** + **성능/보안/감사**까지 장기적으로 버틸 수 있다.

원하면, 위 하드닝 포인트를 바로 적용하는 **Supabase 마이그레이션 SQL 묶음**(확장/인덱스/정책/트리거 포함)도 한 번에 뽑아줄게.