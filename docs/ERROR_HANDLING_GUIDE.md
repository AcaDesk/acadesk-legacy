# 에러 처리 가이드

## 📋 목차
- [개요](#개요)
- [핵심 원칙](#핵심-원칙)
- [사용 방법](#사용-방법)
- [에러 타입](#에러-타입)
- [Supabase 에러 코드](#supabase-에러-코드)
- [실전 예시](#실전-예시)
- [주의사항](#주의사항)

## 개요

Acadesk는 중앙화된 에러 처리 시스템을 사용하여 **사용자 경험**과 **개발자 디버깅**을 동시에 최적화합니다.

### 역할 분리

| 대상 | 보는 내용 | 목적 |
|------|----------|------|
| **사용자** | "이메일이 이미 사용 중입니다." | 친절하고 이해하기 쉬운 안내 |
| **개발자** | `Error 23505: unique constraint violation on users.email` | 디버깅을 위한 상세 기술 정보 |

## 핵심 원칙

### 1. ✅ 항상 `getErrorMessage()` 사용

```typescript
import { getErrorMessage } from '@/lib/error-handlers'

try {
  await someOperation()
} catch (error) {
  // ✅ GOOD: 중앙 에러 처리기 사용
  toast({
    title: '오류 발생',
    description: getErrorMessage(error, 'someOperation'),
    variant: 'destructive'
  })
}
```

### 2. ❌ 직접 에러 메시지 접근 금지

```typescript
// ❌ BAD: 직접 에러 메시지 접근
catch (error) {
  toast({
    title: '오류',
    description: error.message // 보안 위험, 일관성 없음
  })
}

// ❌ BAD: 하드코딩된 메시지
catch (error) {
  toast({
    title: '오류',
    description: '오류가 발생했습니다' // 원인 파악 불가
  })
}
```

### 3. 🔍 Context 파라미터 활용

```typescript
// Context를 제공하면 개발자 로그가 더 명확해집니다
getErrorMessage(error, 'loadStudents')
// Console: [Error in loadStudents] unique constraint violation ...

getErrorMessage(error, 'StudentForm.onSubmit')
// Console: [Error in StudentForm.onSubmit] ...
```

## 사용 방법

### Client Component에서 사용

```typescript
'use client'

import { getErrorMessage } from '@/lib/error-handlers'
import { toast } from '@/hooks/use-toast'

async function onSubmit(data: FormData) {
  try {
    const result = await createStudent(data)

    if (!result.success) {
      throw new Error(result.error)
    }

    toast({
      title: '성공',
      description: '학생이 등록되었습니다.'
    })
  } catch (error) {
    toast({
      title: '학생 등록 실패',
      description: getErrorMessage(error, 'StudentForm.onSubmit'),
      variant: 'destructive'
    })
  }
}
```

### Server Action에서 사용

```typescript
'use server'

import { handleServerActionError } from '@/lib/error-handlers'

export async function createStudent(data: StudentInput) {
  try {
    // Validation
    const validated = studentSchema.parse(data)

    // Database operation
    const { data: student, error } = await supabase
      .from('students')
      .insert(validated)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data: student,
      error: null
    }
  } catch (error) {
    // 자동으로 로깅 + 사용자 친화적 메시지 반환
    return handleServerActionError(error, {
      action: 'createStudent',
      tenant_id: validated.tenant_id
    })
  }
}
```

### API Route에서 사용

```typescript
import { handleApiError } from '@/lib/error-handlers'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Process request
    const result = await processData(body)

    return Response.json({ success: true, data: result })
  } catch (error) {
    // 자동으로 로깅 + HTTP 상태 코드 매핑
    return handleApiError(error, { endpoint: 'POST /api/students' })
  }
}
```

## 에러 타입

### Custom Error Classes

프로젝트에서 제공하는 커스텀 에러 클래스를 사용하면 더 명확한 에러 처리가 가능합니다:

```typescript
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError
} from '@/lib/error-types'

// 사용 예시
if (!student) {
  throw new NotFoundError('학생')
}

if (user.role !== 'owner') {
  throw new AuthorizationError('원장만 접근 가능합니다')
}

if (duplicateEmail) {
  throw new ConflictError('이미 사용 중인 이메일입니다')
}
```

**장점:**
- 자동으로 적절한 HTTP 상태 코드 설정
- 일관된 에러 응답 구조
- Type-safe 에러 처리

## Supabase 에러 코드

### PostgreSQL Error Codes

| 코드 | 의미 | 사용자 메시지 | HTTP 상태 |
|------|------|--------------|----------|
| `23505` | Unique violation | "이미 존재하는 데이터입니다" | 409 |
| `23503` | Foreign key violation | "참조된 데이터가 존재하지 않습니다" | 400 |
| `23502` | Not null violation | "필수 입력값이 누락되었습니다" | 400 |
| `42501` | Insufficient privilege | "권한이 없습니다" | 403 |
| `42P01` | Undefined table | "테이블을 찾을 수 없습니다" | 500 |

### PostgREST Error Codes

| 코드 | 의미 | 사용자 메시지 | HTTP 상태 |
|------|------|--------------|----------|
| `PGRST116` | No rows returned | "데이터를 찾을 수 없습니다" | 404 |
| `PGRST301` | JWT expired | "인증이 필요합니다" | 401 |
| `PGRST302` | JWT invalid | "인증 정보가 올바르지 않습니다" | 401 |

### Network & Timeout Errors

| 에러 메시지 패턴 | 사용자 메시지 |
|-----------------|--------------|
| `fetch failed`, `Network request failed`, `Failed to fetch` | "네트워크 연결을 확인해주세요" |
| `timeout`, `timed out` | "요청 시간이 초과되었습니다. 다시 시도해주세요" |

## 실전 예시

### 예시 1: 폼 제출

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getErrorMessage } from '@/lib/error-handlers'
import { toast } from '@/hooks/use-toast'
import { studentSchema } from '@/lib/validators'

export function StudentForm() {
  const form = useForm({
    resolver: zodResolver(studentSchema)
  })

  const onSubmit = async (data: StudentInput) => {
    try {
      const result = await createStudent(data)

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: '성공',
        description: '학생이 등록되었습니다.'
      })

      router.push(`/students/${result.data.id}`)
    } catch (error) {
      toast({
        title: '학생 등록 실패',
        description: getErrorMessage(error, 'StudentForm.onSubmit'),
        variant: 'destructive'
      })
    }
  }

  return <Form onSubmit={form.handleSubmit(onSubmit)}>...</Form>
}
```

### 예시 2: 데이터 로딩

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/lib/error-handlers'
import { createClient } from '@/lib/supabase/client'

export function StudentList() {
  const [students, setStudents] = useState([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .is('deleted_at', null)

      if (error) throw error

      setStudents(data)
      setError(null)
    } catch (err) {
      const message = getErrorMessage(err, 'StudentList.loadStudents')
      setError(message)
    }
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-800">데이터 로딩 오류</h3>
        <p className="text-yellow-700">{error}</p>
      </div>
    )
  }

  return <div>...</div>
}
```

### 예시 3: Server Action with Validation

```typescript
'use server'

import { z } from 'zod'
import { handleServerActionError } from '@/lib/error-handlers'
import { ValidationError } from '@/lib/error-types'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const createStudentSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  grade: z.string().min(1, '학년은 필수입니다')
})

export async function createStudent(input: unknown) {
  try {
    // 1. Validation
    const validated = createStudentSchema.parse(input)

    // 2. Business logic validation
    const supabase = createServiceRoleClient()
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('email', validated.email)
      .maybeSingle()

    if (existing) {
      throw new ValidationError('이미 등록된 이메일입니다', {
        email: ['이 이메일은 이미 사용 중입니다']
      })
    }

    // 3. Database operation
    const { data, error } = await supabase
      .from('students')
      .insert(validated)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      data,
      error: null
    }
  } catch (error) {
    return handleServerActionError(error, {
      action: 'createStudent',
      input
    })
  }
}
```

## 주의사항

### ⚠️ 중복 로깅 방지

`getErrorMessage()`는 내부적으로 `console.error()`를 호출하므로, 별도로 로깅할 필요가 없습니다:

```typescript
// ❌ BAD: 중복 로깅
catch (error) {
  console.error('Error:', error) // 불필요
  toast({
    description: getErrorMessage(error) // 내부에서 이미 로깅함
  })
}

// ✅ GOOD: getErrorMessage만 사용
catch (error) {
  toast({
    description: getErrorMessage(error, 'contextName')
  })
}
```

### 🔒 보안 고려사항

- **절대로** 민감한 정보(비밀번호, 토큰 등)를 에러 메시지에 포함하지 마세요
- 프로덕션 환경에서는 상세한 스택 트레이스를 사용자에게 노출하지 마세요
- `getErrorMessage()`는 자동으로 기술적 세부사항을 필터링합니다

### 📊 에러 추적 서비스 연동

프로덕션에서는 Sentry 등의 에러 추적 서비스 연동을 권장합니다:

```typescript
// lib/error-handlers.ts의 logError 함수에서 이미 준비됨
if (process.env.NODE_ENV === 'production') {
  // TODO: Sentry.captureException(error, { extra: errorInfo })
}
```

## 체크리스트

새로운 기능을 추가할 때 다음을 확인하세요:

- [ ] 모든 `try-catch` 블록에서 `getErrorMessage()` 사용
- [ ] Server Action에서 `handleServerActionError()` 사용
- [ ] API Route에서 `handleApiError()` 사용
- [ ] Context 파라미터 제공하여 디버깅 용이성 확보
- [ ] 적절한 Custom Error 클래스 사용
- [ ] 사용자 친화적인 에러 메시지 확인
- [ ] 중복 로깅 제거
- [ ] 민감한 정보 노출 여부 확인
