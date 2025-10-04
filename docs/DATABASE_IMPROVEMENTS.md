# 데이터베이스 개선 사항 요약

## 주요 개선 내용

### 1. PII(개인정보) 분리 ✅
- `user_pii`, `student_pii` 테이블로 민감 정보 분리
- pgcrypto를 사용한 암호화 (`encrypt_pii`, `decrypt_pii` 함수)
- 해시 인덱스로 빠른 조회 지원
- SECURITY DEFINER 뷰(`user_profiles`)로 안전한 접근 제공

### 2. 코드 테이블 도입 ✅
- `ref_roles`: 역할 관리
- `ref_status_codes`: 상태 코드 중앙 관리
- DDL 변경 없이 새로운 상태/역할 추가 가능

### 3. 학부모-학생 다대다 관계 ✅
- `guardians` 테이블: 보호자 정보
- `student_guardians` 중간 테이블
- 권한 세분화: `is_primary`, `can_pickup`, `can_view_reports`

### 4. 시험 구조 확장 ✅
```
exam_definitions (시험 정의)
  └─> exam_instances (반별 시행)
       └─> exam_attempts (학생 응시)
```
- 문항별 관리 가능한 JSONB 구조
- 재시험, 보충시험 지원

### 5. 알림 시스템 3단 구조 ✅
```
notification_templates (템플릿)
  └─> notification_messages (메시지)
       └─> notification_deliveries (발송 내역)
```
- 채널별 발송 상태 추적
- 재시도 관리
- 템플릿 기반 메시지 생성

### 6. 리포트 불변성 ✅
- UPDATE 방지 트리거 (`prevent_report_update`)
- 수정 필요시 새 리포트 생성

### 7. 성능 최적화 ✅
- `auth.current_user_role()`: 세션 캐싱
- 적절한 인덱스 추가
- RLS 정책 최적화

## 마이그레이션 실행 순서

```sql
-- 1. 기본 스키마
001_initial_schema.sql

-- 2. RLS 정책
002_rls_policies.sql

-- 3. 개선된 스키마
003_improved_schema.sql

-- 4. 개발용 샘플 데이터 (선택사항)
004_sample_data.sql
```

## 보안 고려사항

### PII 암호화
- 프로덕션에서는 AWS KMS, HashiCorp Vault 등 사용
- 암호화 키 로테이션 정책 수립
- 접근 로그 모니터링

### RLS 정책
- 테넌트 격리 철저히 유지
- 역할별 접근 제어
- PII는 owner 역할만 관리 가능

## 향후 확장 가능성

1. **문항별 시험 관리**
   - `exam_items`, `exam_item_responses` 테이블 추가

2. **알림 스케줄링**
   - 정기 알림, 반복 알림 지원

3. **감사 로그**
   - `audit_logs` 테이블로 모든 변경 추적

4. **파일 관리**
   - 교재, 과제 파일 업로드/다운로드

## 주의사항

⚠️ **프로덕션 배포 전 필수 작업**
1. 실제 암호화 키 관리 시스템 구축
2. 백업/복구 전략 수립
3. 모니터링 및 알림 설정
4. 성능 테스트 및 최적화
5. 보안 감사