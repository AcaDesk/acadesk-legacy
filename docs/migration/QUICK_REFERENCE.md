# 🚀 마이그레이션 Quick Reference

> 빠른 참조를 위한 Server Actions 사용 가이드

## 📁 생성된 Server Actions

| 파일 | 함수 | 설명 | 권한 |
|------|------|------|------|
| **students.ts** | `getStudentDetail` | 학생 상세 정보 조회 (Read) | staff |
| | `createStudent` | 학생 생성 | staff |
| | `updateStudent` | 학생 정보 수정 | staff |
| | `deleteStudent` | 학생 삭제 (Soft Delete) | staff |
| | `withdrawStudent` | 학생 퇴원 처리 | staff |
| **consultations.ts** | `createConsultation` | 상담 기록 생성 | instructor+ |
| **attendance.ts** | `createAttendanceSession` | 출석 세션 생성 | staff |
| | `bulkUpsertAttendance` | 출석 일괄 저장 | staff |
| | `deleteAttendanceSession` | 출석 세션 삭제 | staff |
| **grades.ts** | `createExamScore` | 개별 성적 입력 | staff |
| | `bulkUpsertExamScores` | 일괄 성적 입력 | staff |
| | `deleteExamScore` | 성적 삭제 | staff |
| **guardians.ts** | `createGuardian` | 보호자 생성 | staff |
| | `updateGuardian` | 보호자 수정 | staff |
| | `deleteGuardian` | 보호자 삭제 | staff |

## 🔧 사용 예시

### 1. 학생 상세 정보 조회 (Server Component)
```typescript
// src/app/(dashboard)/students/[id]/page.tsx
import { getStudentDetail } from '@/app/actions/students'

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params

  const result = await getStudentDetail(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return <StudentDetailClient initialData={result.data} />
}
```

### 2. 상담 기록 생성
```typescript
import { createConsultation } from '@/app/actions/consultations'

const result = await createConsultation({
  student_id: 'uuid',
  consultation_date: '2025-10-23',
  consultation_type: '대면',
  content: '학습 태도가 좋아졌습니다.',
})

if (!result.success) {
  // 에러 처리
  console.error(result.error)
}
```

### 3. 출석 일괄 저장
```typescript
import { bulkUpsertAttendance } from '@/app/actions/attendance'

const result = await bulkUpsertAttendance({
  session_id: 'session-uuid',
  attendances: [
    {
      student_id: 'student-1',
      status: 'present',
      check_in_at: new Date().toISOString(),
    },
    {
      student_id: 'student-2',
      status: 'late',
      check_in_at: new Date().toISOString(),
    },
  ],
})
```

### 4. 일괄 성적 입력
```typescript
import { bulkUpsertExamScores } from '@/app/actions/grades'

const result = await bulkUpsertExamScores({
  exam_id: 'exam-uuid',
  scores: [
    {
      student_id: 'student-1',
      score: 90,
      total_points: 100,
      percentage: 90,
      feedback: '잘했습니다',
    },
    // ... more scores
  ],
})
```

### 5. 보호자 생성 + 학생 연결
```typescript
import { createGuardian } from '@/app/actions/guardians'

const result = await createGuardian({
  name: '김철수',
  phone: '010-1234-5678',
  email: 'parent@example.com',
  relationship: '부',
  student_ids: ['student-1', 'student-2'], // 여러 학생 연결
})
```

## ✅ 체크리스트

### 마이그레이션 전
- [ ] Phase 1 완료 확인 (TODO, 학생)
- [ ] `pnpm type-check` 통과
- [ ] 로컬 Supabase 실행 중

### 마이그레이션 후
- [x] Phase 1 완료 ✅
- [x] Phase 3 완료 ✅
- [x] 타입 체크 통과 ✅
- [ ] Phase 2 테스트 진행 중 🔄

### 다음 테스트 항목
1. [ ] 상담 기록 생성 및 조회
2. [ ] 출석 세션 생성 및 일괄 저장
3. [ ] 성적 개별/일괄 입력
4. [ ] 보호자 생성 및 학생 연결
5. [ ] 권한 검증 (instructor/staff)
6. [ ] 에러 핸들링 (잘못된 입력)

## 🔍 트러블슈팅

### 권한 에러
```
Error: 이 작업을 수행할 권한이 없습니다
```
→ `verifyStaff()` 또는 `verifyRole()` 통과 필요

### Zod 검증 에러
```
Error: 유효한 학생 ID가 아닙니다
```
→ UUID 형식 확인

### 타입 에러
```
Type 'string | undefined' is not assignable to type 'string'
```
→ `|| null` 또는 `.optional()` 사용

## 📊 성능 목표

| 작업 | 데이터 수 | 목표 시간 |
|------|-----------|-----------|
| 일괄 출석 저장 | 50명 | < 3초 |
| 일괄 성적 입력 | 30명 | < 2초 |
| 보호자 생성 | 1명 | < 1초 |
| TODO 일괄 생성 | 100개 | < 5초 |

## 📚 전체 문서

- 📋 **체크리스트**: `MIGRATION_CHECKLIST.md`
- 📝 **상세 요약**: `MIGRATION_SUMMARY_PHASE3.md`
- 🏛️ **아키텍처**: `CLAUDE.md`
- 📖 **Phase 1**: `docs/dev_logs/MIGRATION_SUMMARY.md`

---

**최종 업데이트**: 2025-10-23
