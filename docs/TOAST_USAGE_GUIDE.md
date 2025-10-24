# 토스트 사용 가이드

## 📋 목차
- [개요](#개요)
- [기본 원칙](#기본-원칙)
- [헬퍼 함수 사용법](#헬퍼-함수-사용법)
- [실전 예시](#실전-예시)
- [마이그레이션 가이드](#마이그레이션-가이드)
- [주의사항](#주의사항)

## 개요

Acadesk는 일관된 사용자 경험을 위해 **Toast Helper Functions**를 제공합니다.

### 개선된 점

| Before | After |
|--------|-------|
| `TOAST_REMOVE_DELAY = 1000000ms` (16분!) | `5000ms` (5초) ✅ |
| 반복적인 `toast()` 호출 | `showSuccessToast()` 등 헬퍼 함수 사용 |
| 수동 `getErrorMessage()` 호출 | 자동으로 적용됨 |
| 중복 코드 | 재사용 가능한 함수 |

## 기본 원칙

### ✅ DO: 헬퍼 함수 사용

```typescript
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers'

// 성공
showSuccessToast('학생 등록 완료', '새 학생이 등록되었습니다.')

// 에러 (자동으로 getErrorMessage 적용)
catch (error) {
  showErrorToast('학생 등록 실패', error, 'StudentForm.onSubmit')
}
```

### ❌ DON'T: 직접 toast() 호출

```typescript
// ❌ BAD: 반복적이고 일관성 없음
toast({
  title: '성공',
  description: '...',
})

// ❌ BAD: getErrorMessage를 수동으로 호출
toast({
  title: '오류',
  description: getErrorMessage(error),
  variant: 'destructive'
})
```

## 헬퍼 함수 사용법

### 1. 성공 토스트

```typescript
import { showSuccessToast } from '@/lib/toast-helpers'

// 기본 사용
showSuccessToast('저장 완료')

// 상세 설명 포함
showSuccessToast('학생 등록 완료', '새 학생이 등록되었습니다.')
```

**표시 시간**: 5초

### 2. 에러 토스트 ⭐ (가장 많이 사용)

```typescript
import { showErrorToast } from '@/lib/toast-helpers'

try {
  await createStudent(data)
} catch (error) {
  // 자동으로 getErrorMessage 적용 + 개발자 로그 기록
  showErrorToast('학생 등록 실패', error, 'StudentForm.onSubmit')
}
```

**특징:**
- 자동으로 `getErrorMessage()` 호출
- Context 파라미터로 디버깅 정보 제공
- 빨간색 destructive variant
- 표시 시간: 7초 (에러 메시지는 읽을 시간 필요)

### 3. 유효성 검사 에러

```typescript
import { showValidationToast } from '@/lib/toast-helpers'

if (!selectedStudents.length) {
  showValidationToast('학생을 선택해주세요.')
  return
}

if (!form.getValues('email')) {
  showValidationToast('이메일을 입력해주세요.')
  return
}
```

**자동 설정:**
- Title: "입력 오류"
- Variant: destructive

### 4. 경고 토스트

```typescript
import { showWarningToast } from '@/lib/toast-helpers'

showWarningToast('권한 부족', '원장만 접근 가능합니다.')
```

### 5. 정보 토스트

```typescript
import { showInfoToast } from '@/lib/toast-helpers'

showInfoToast('준비 중', '이 기능은 곧 출시됩니다.')
```

### 6. Promise 기반 작업 (로딩 → 성공/에러)

```typescript
import { toastPromise } from '@/lib/toast-helpers'

// 자동으로 로딩 → 성공/에러 처리
await toastPromise(
  createStudent(data),
  {
    loading: '학생 등록 중...',
    success: '학생이 등록되었습니다.',
    error: '학생 등록 실패'
  },
  'StudentForm.onSubmit' // context (optional)
)

router.push('/students')
```

**동작:**
1. 로딩 토스트 표시
2. Promise 대기
3. 성공 시: 로딩 토스트 닫고 성공 토스트 표시
4. 실패 시: 로딩 토스트 닫고 에러 토스트 표시

### 7. 복사 완료

```typescript
import { showCopyToast } from '@/lib/toast-helpers'

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
  showCopyToast() // "클립보드에 복사되었습니다."
}

// 커스텀 메시지
showCopyToast('학생 코드가 복사되었습니다.')
```

### 8. 삭제 확인

```typescript
import { showDeleteToast } from '@/lib/toast-helpers'

async function deleteStudent(id: string) {
  await deleteStudentApi(id)
  showDeleteToast('학생이 삭제되었습니다.')
}
```

**되돌리기 버튼 추가**

되돌리기 버튼이 필요한 경우, shadcn/ui의 ToastAction을 직접 사용하세요:

```typescript
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@ui/toast'

async function deleteStudent(id: string) {
  const backup = await getStudent(id)
  await deleteStudentApi(id)

  toast({
    title: '삭제 완료',
    description: '학생이 삭제되었습니다.',
    action: (
      <ToastAction
        altText="되돌리기"
        onClick={async () => {
          await restoreStudent(backup)
          showSuccessToast('삭제가 취소되었습니다.')
        }}
      >
        되돌리기
      </ToastAction>
    )
  })
}
```

### 9. 특정 에러 타입

```typescript
import {
  showNetworkErrorToast,
  showPermissionErrorToast
} from '@/lib/toast-helpers'

// 네트워크 에러
catch (error) {
  if (error.message.includes('fetch failed')) {
    showNetworkErrorToast()
    return
  }
  showErrorToast('오류 발생', error)
}

// 권한 에러
if (user.role !== 'owner') {
  showPermissionErrorToast()
  return
}

// 커스텀 메시지
showPermissionErrorToast('강사만 이 기능을 사용할 수 있습니다.')
```

## 실전 예시

### 예시 1: 폼 제출

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { showSuccessToast, showErrorToast } from '@/lib/toast-helpers'
import { createStudent } from '@/app/actions/students'

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

      // ✅ 간결하고 명확
      showSuccessToast('학생 등록 완료', '새 학생이 등록되었습니다.')
      router.push(`/students/${result.data.id}`)
    } catch (error) {
      // ✅ 자동으로 getErrorMessage 적용
      showErrorToast('학생 등록 실패', error, 'StudentForm.onSubmit')
    }
  }

  return <Form onSubmit={form.handleSubmit(onSubmit)}>...</Form>
}
```

### 예시 2: Promise 기반 작업

```typescript
'use client'

import { toastPromise } from '@/lib/toast-helpers'
import { createReport } from '@/app/actions/reports'

export function ReportGenerator() {
  const handleGenerate = async () => {
    // ✅ 로딩 → 성공/에러 자동 처리
    const result = await toastPromise(
      createReport(studentId, period),
      {
        loading: '리포트 생성 중...',
        success: '리포트가 생성되었습니다.',
        error: '리포트 생성 실패'
      },
      'ReportGenerator.handleGenerate'
    )

    router.push(`/reports/${result.data.id}`)
  }

  return <Button onClick={handleGenerate}>리포트 생성</Button>
}
```

### 예시 3: 유효성 검사

```typescript
'use client'

import { showValidationToast, showSuccessToast } from '@/lib/toast-helpers'
import { sendMessages } from '@/app/actions/messages'

export function MessageDialog() {
  const handleSend = async () => {
    // ✅ 유효성 검사 에러
    if (!selectedStudents.length) {
      showValidationToast('메시지를 받을 학생을 선택해주세요.')
      return
    }

    if (!message.trim()) {
      showValidationToast('메시지 내용을 입력해주세요.')
      return
    }

    try {
      const result = await sendMessages({
        studentIds: selectedStudents,
        message
      })

      showSuccessToast(
        '메시지 전송 완료',
        `${result.data.successCount}건 성공, ${result.data.failCount}건 실패`
      )
    } catch (error) {
      showErrorToast('메시지 전송 실패', error, 'MessageDialog.handleSend')
    }
  }

  return <Dialog>...</Dialog>
}
```

### 예시 4: 데이터 로딩 에러

```typescript
'use client'

import { useEffect, useState } from 'react'
import { showErrorToast } from '@/lib/toast-helpers'
import { getStudents } from '@/app/actions/students'

export function StudentList() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStudents()
  }, [])

  async function loadStudents() {
    try {
      setLoading(true)
      const result = await getStudents()

      if (!result.success) {
        throw new Error(result.error)
      }

      setStudents(result.data)
    } catch (error) {
      // ✅ 사용자 친화적 에러 + 개발자 로그
      showErrorToast('학생 목록 로드 실패', error, 'StudentList.loadStudents')
    } finally {
      setLoading(false)
    }
  }

  return <div>...</div>
}
```

## 마이그레이션 가이드

### Before → After

#### 1. 성공 토스트

```typescript
// ❌ Before
toast({
  title: '저장 완료',
  description: '학생이 등록되었습니다.',
})

// ✅ After
showSuccessToast('저장 완료', '학생이 등록되었습니다.')
```

#### 2. 에러 토스트

```typescript
// ❌ Before
catch (error) {
  console.error('Error:', error)
  toast({
    title: '오류',
    description: getErrorMessage(error),
    variant: 'destructive'
  })
}

// ✅ After
catch (error) {
  showErrorToast('학생 등록 실패', error, 'StudentForm.onSubmit')
}
```

#### 3. 유효성 검사

```typescript
// ❌ Before
if (!email) {
  toast({
    title: '입력 오류',
    description: '이메일을 입력해주세요.',
    variant: 'destructive'
  })
  return
}

// ✅ After
if (!email) {
  showValidationToast('이메일을 입력해주세요.')
  return
}
```

## 주의사항

### ⚠️ 너무 많은 토스트 표시 금지

```typescript
// ❌ BAD: 반복문에서 토스트 표시
students.forEach(student => {
  showSuccessToast(`${student.name} 처리 완료`)
})

// ✅ GOOD: 한 번만 표시
const count = students.length
showSuccessToast('처리 완료', `${count}명의 학생이 처리되었습니다.`)
```

### ⚠️ 로딩 토스트는 반드시 dismiss

```typescript
// ❌ BAD: dismiss 없음
const loading = showLoadingToast('처리 중...')
await someOperation()
// 토스트가 영원히 표시됨!

// ✅ GOOD: 반드시 dismiss
const loading = showLoadingToast('처리 중...')
try {
  await someOperation()
  loading.dismiss()
  showSuccessToast('완료')
} catch (error) {
  loading.dismiss() // finally 블록에서 처리하는 것도 좋음
  showErrorToast('실패', error)
}
```

### ⚠️ Promise 함수 사용 권장

로딩 토스트를 직접 관리하는 대신 `toastPromise` 사용:

```typescript
// ✅ BETTER: 자동으로 로딩 관리
await toastPromise(
  someOperation(),
  {
    loading: '처리 중...',
    success: '완료',
    error: '실패'
  }
)
```

## Toast 표시 시간

| 타입 | 시간 | 이유 |
|------|------|------|
| 성공 | 5초 | 충분히 인지 가능 |
| 에러 | 7초 | 에러 메시지는 읽을 시간 필요 |
| 경고 | 6초 | 중요한 정보 |
| 정보 | 5초 | 일반 정보 |
| 복사 | 3초 | 짧은 확인 |
| 로딩 | ∞ | 수동 dismiss 필요 |

설정 변경이 필요한 경우: `src/lib/toast-helpers.ts`의 `TOAST_CONFIG` 수정

## 체크리스트

새로운 기능 추가 시 확인:

- [ ] `showSuccessToast()` 사용 (직접 `toast()` 호출 금지)
- [ ] `showErrorToast()` 사용 (context 파라미터 제공)
- [ ] 유효성 검사는 `showValidationToast()` 사용
- [ ] Promise 작업은 `toastPromise()` 고려
- [ ] 로딩 토스트는 반드시 dismiss
- [ ] 반복문에서 토스트 여러 번 표시하지 않기
- [ ] 사용자 친화적인 메시지 작성
