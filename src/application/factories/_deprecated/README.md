# ⚠️ Deprecated Factory Files

> 이 폴더의 파일들은 **사용하지 않습니다**. Server Actions로 마이그레이션되었습니다.

---

## 📋 왜 Deprecated 되었나요?

**이전 방식 (Client-side Factory)**:
```typescript
// ❌ 클라이언트에서 직접 Use Case 호출
'use client'
import { createSignUpUseCase } from '@/application/factories/authUseCaseFactory.client'

export default function SignupForm() {
  const signUpUseCase = createSignUpUseCase()
  const result = await signUpUseCase.execute({ email, password })
  // ...
}
```

**문제점**:
- 클라이언트에서 직접 DB 접근 (보안 위험)
- RLS 정책에만 의존 (우회 불가능)
- 테넌트 격리 검증이 클라이언트에 노출됨

---

**새로운 방식 (Server Actions)**:
```typescript
// ✅ Server Actions 사용
'use client'
import { signUp } from '@/app/actions/auth'

export default function SignupForm() {
  const result = await signUp({ email, password })
  // ...
}
```

**장점**:
- 서버에서만 DB 접근 (보안 강화)
- service_role 사용 가능 (RLS 우회)
- 권한 검증이 서버에서 이루어짐
- 테넌트 격리 로직이 서버에 숨겨짐

---

## 🗂️ 마이그레이션 상태

| 파일 | 상태 | 대체 파일 |
|------|------|----------|
| `authUseCaseFactory.client.ts` | ✅ Deprecated | `app/actions/auth.ts` |

---

## 🧹 정리 계획

모든 마이그레이션 완료 및 충분한 테스트 후, 이 폴더는 완전히 삭제될 예정입니다.

**삭제 예정일**: 2025-12-01

---

**참고 문서**:
- [마이그레이션 로드맵](../../../../docs/migration/MIGRATION_ROADMAP.md)
- [폴더 구조 표준안](../../../../docs/FOLDER_STRUCTURE.md)
