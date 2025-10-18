# Auth 도메인 Clean Architecture

Auth (인증 및 온보딩) 도메인을 Clean Architecture로 리팩토링한 문서입니다.

## 완료된 작업

### 1. Domain Layer (도메인 레이어)

#### Value Objects

- **`Email`** - src/domain/value-objects/Email.ts
  - 이메일 검증 및 정규화
  - 도메인 추출, 무료 이메일 판별
  - 개인정보 마스킹 (u***@example.com)

- **`Password`** - src/domain/value-objects/Password.ts
  - 비밀번호 강도 검증 (weak/medium/strong)
  - 최소 길이, 복잡도, 흔한 비밀번호 검사
  - 안전한 비밀번호 생성 권장

- **`InvitationToken`** - src/domain/value-objects/InvitationToken.ts
  - 암호학적으로 안전한 토큰 생성 (crypto.randomBytes)
  - 토큰 형식 검증
  - 마스킹 및 짧은 코드 생성

#### Entities

- **`User`** - src/domain/entities/User.ts
  - 사용자 도메인 엔티티
  - 비즈니스 로직: 권한 확인, 온보딩 상태, 승인 관리
  - 불변성 보장 (Immutable pattern)
  - 상태 변경 메서드: approve, reject, completeOnboarding, updateProfile

- **`Invitation`** - src/domain/entities/Invitation.ts
  - 초대장 도메인 엔티티 (MVP: 미사용, 추후 구현)
  - 비즈니스 로직: 만료 확인, 유효성 검증
  - 상태 변경 메서드: accept, reject, expire, extendExpiry

- **`OnboardingState`** - src/domain/entities/OnboardingState.ts
  - 온보딩 상태 엔티티
  - 비즈니스 로직: 다음 단계 결정, 진행률 계산
  - 이메일 인증, 프로필 생성, 승인, 온보딩 단계별 상태 관리

#### Repository Interfaces

- **`IAuthRepository`** - src/domain/repositories/IAuthRepository.ts
  - 인증 작업 계약 (회원가입, 로그인, OAuth, 비밀번호 재설정)

- **`IUserRepository`** - src/domain/repositories/IUserRepository.ts
  - 사용자 데이터 접근 계약 (CRUD, 승인, 거부)

- **`IOnboardingRepository`** - src/domain/repositories/IOnboardingRepository.ts
  - 온보딩 작업 계약 (상태 조회, 원장 온보딩, 학원 설정)

- **`IInvitationRepository`** - src/domain/repositories/IInvitationRepository.ts
  - 초대장 데이터 접근 계약 (MVP: 미사용, 추후 구현)

### 2. Infrastructure Layer (인프라 레이어)

#### Supabase Implementations

- **`SupabaseAuthRepository`** - src/infrastructure/database/SupabaseAuthRepository.ts
  - IAuthRepository 구현
  - Supabase Auth API 호출
  - 에러 메시지 한글화

- **`SupabaseUserRepository`** - src/infrastructure/database/SupabaseUserRepository.ts
  - IUserRepository 구현
  - users 테이블 CRUD 작업
  - Entity ↔ Database Row 매핑

- **`SupabaseOnboardingRepository`** - src/infrastructure/database/SupabaseOnboardingRepository.ts
  - IOnboardingRepository 구현
  - RPC 함수 호출 (get_onboarding_state, complete_owner_onboarding, finish_owner_academy_setup)

- **`SupabaseInvitationRepository`** - src/infrastructure/database/SupabaseInvitationRepository.ts
  - IInvitationRepository 구현 (MVP: 미사용, 추후 구현)

### 3. Application Layer (애플리케이션 레이어)

#### Auth Use Cases

```
src/application/use-cases/auth/
├── SignUpUseCase.ts                    # 회원가입
├── SignInUseCase.ts                    # 로그인
├── SignOutUseCase.ts                   # 로그아웃
├── SignInWithOAuthUseCase.ts           # OAuth 로그인
├── ResetPasswordUseCase.ts             # 비밀번호 재설정 이메일 전송
├── UpdatePasswordUseCase.ts            # 비밀번호 업데이트
├── CompleteOwnerOnboardingUseCase.ts   # 원장 온보딩 완료
├── CompleteAcademySetupUseCase.ts      # 학원 설정 완료
└── GetOnboardingStateUseCase.ts        # 온보딩 상태 조회
```

#### Factory Functions

```
src/application/factories/
├── authUseCaseFactory.ts               # 서버 사이드용
└── authUseCaseFactory.client.ts        # 클라이언트용
```

## 아키텍처 구조

```
┌─────────────────────────────────────────────┐
│         Presentation Layer                  │
│  (Components, Pages)                        │
└──────────────┬──────────────────────────────┘
               │ DTO
               ▼
┌─────────────────────────────────────────────┐
│         Application Layer                   │
│  (Use Cases, Factories)                     │
└──────────────┬──────────────────────────────┘
               │ Domain Entity
               ▼
┌─────────────────────────────────────────────┐
│         Domain Layer                        │
│  (Entities, Value Objects, Interfaces)      │
└──────────────┬──────────────────────────────┘
               │ Repository Interface
               ▼
┌─────────────────────────────────────────────┐
│         Infrastructure Layer                │
│  (Supabase Repositories)                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
           Database
```

## 사용 예시

### 1. 회원가입 (Client Component)

#### Before (기존)

```typescript
// src/components/auth/SignupForm.tsx
import { authService } from '@/services/auth/auth.service'

const handleSignup = async (data: SignupFormData) => {
  const result = await authService.signUp({
    email: data.email,
    password: data.password,
  })

  if (result.error) {
    setError(result.error.message)
  }
}
```

#### After (Clean Architecture)

```typescript
// src/components/auth/SignupForm.tsx
import { createSignUpUseCase } from '@/application/factories/authUseCaseFactory.client'

const handleSignup = async (data: SignupFormData) => {
  const useCase = createSignUpUseCase()

  const result = await useCase.execute({
    email: data.email,
    password: data.password,
  })

  if (result.error) {
    setError(result.error.message)
  }
}
```

### 2. 온보딩 상태 조회 (Server Component)

#### Before (기존)

```typescript
// src/app/onboarding/page.tsx
import { onboardingService } from '@/services/auth/onboardingService'

const user = await supabase.auth.getUser()
const { data: state } = await onboardingService.checkOnboardingStatus(user.id)
```

#### After (Clean Architecture)

```typescript
// src/app/onboarding/page.tsx
import { createGetOnboardingStateUseCase } from '@/application/factories/authUseCaseFactory'

const useCase = await createGetOnboardingStateUseCase()
const { state } = await useCase.execute()

// 비즈니스 로직이 Entity에 캡슐화됨
const nextStep = state?.getNextStep()
const progress = state?.getProgressPercentage()
const needsOnboarding = state?.needsOnboarding()
```

### 3. 원장 온보딩 완료

#### Before (기존)

```typescript
// src/services/auth/onboardingService.ts
const { data: result } = await supabase.rpc('complete_owner_onboarding', {
  _user_id: userId,
  _name: data.name,
  _academy_name: data.academyName,
  _slug: null,
})

if (!result?.success) {
  throw new Error(result?.error || '온보딩 완료에 실패했습니다.')
}
```

#### After (Clean Architecture)

```typescript
// Using Use Case
import { createCompleteOwnerOnboardingUseCase } from '@/application/factories/authUseCaseFactory'

const useCase = await createCompleteOwnerOnboardingUseCase()

const result = await useCase.execute({
  userId,
  name: data.name,
  academyName: data.academyName,
})

if (!result.success) {
  throw new Error(result.error || '온보딩 완료에 실패했습니다.')
}
```

## 주요 비즈니스 로직

### 1. Email Value Object

```typescript
// 이메일 생성 및 검증
const email = Email.create('user@example.com')

// 도메인 확인
console.log(email.getDomain())           // 'example.com'
console.log(email.isFreeEmail())         // false

// 개인정보 보호 (마스킹)
console.log(email.mask())                // 'us***@example.com'
```

### 2. Password Value Object

```typescript
// 비밀번호 검증
const password = Password.create('MyP@ssw0rd123')

// 강도 확인
console.log(password.getStrength())      // 'strong'
console.log(password.isStrong())         // true

// 검증 결과 확인
const validation = Password.validate('weak')
console.log(validation.isValid)          // false
console.log(validation.errors)           // ['비밀번호는 최소 6자 이상이어야 합니다.']
```

### 3. User Entity

```typescript
// 사용자 권한 확인
const user = User.create({ ... })

console.log(user.isOwner())              // true/false
console.log(user.canManageTenant())      // true/false
console.log(user.needsOnboarding())      // true/false

// 상태 변경 (불변성 패턴)
const approvedUser = user.approve(approvedBy)
const onboardedUser = user.completeOnboarding()
```

### 4. OnboardingState Entity

```typescript
// 온보딩 상태 조회
const state = OnboardingState.create({ ... })

// 다음 단계 결정
const nextStep = state.getNextStep()
// 'email-confirmation' | 'profile-creation' | 'awaiting-approval' |
// 'owner-onboarding' | 'staff-onboarding' | 'completed'

// 진행률
const progress = state.getProgressPercentage()  // 0-100

// 상태 확인
console.log(state.needsOnboarding())            // true/false
console.log(state.hasCompletedAllSteps())       // true/false
```

## 데이터베이스 매핑

### users 테이블

```
id                     → User.id
tenant_id              → User.tenantId
email                  → Email.create(row.email)
name                   → User.name
phone                  → User.phone
role_code              → User.roleCode
onboarding_completed   → User.onboardingCompleted
approval_status        → User.approvalStatus
settings               → User.settings
preferences            → User.preferences
```

## 장점 요약

### 1. 타입 안정성 ⬆️
- Email, Password Value Objects로 형식 검증
- 도메인 규칙이 타입 시스템에 강제됨
- 런타임 에러 감소

### 2. 비즈니스 로직 캡슐화 ⬆️
- 이메일 마스킹, 비밀번호 강도 검증이 Value Object에 집중
- 사용자 권한, 온보딩 단계 판별이 Entity에 캡슐화
- 코드 재사용성 증가

### 3. 테스트 용이성 ⬆️
```typescript
// Value Object 단위 테스트
test('should mask email for privacy', () => {
  const email = Email.create('user@example.com')
  expect(email.mask()).toBe('us***@example.com')
})

// Entity 단위 테스트
test('should determine next onboarding step', () => {
  const state = OnboardingState.create({
    authUserId: 'test',
    emailConfirmed: true,
    appUserExists: false,
  })
  expect(state.getNextStep()).toBe('profile-creation')
})

// Use Case 단위 테스트 (Mock Repository)
test('should sign up user with valid credentials', async () => {
  const mockRepo = createMockAuthRepository()
  const useCase = new SignUpUseCase(mockRepo)

  const result = await useCase.execute({
    email: 'test@example.com',
    password: 'SecureP@ss123',
  })

  expect(result.error).toBeNull()
  expect(mockRepo.signUp).toHaveBeenCalled()
})
```

### 4. 유지보수성 ⬆️
- 비밀번호 정책 변경 시 Password Value Object만 수정
- 이메일 검증 로직 변경 시 Email Value Object만 수정
- 데이터베이스 교체 시 Repository 구현체만 교체

### 5. 확장성 ⬆️
- 새로운 인증 방식 추가가 쉬움 (SMS, WebAuthn 등)
- Use Case 추가로 새로운 비즈니스 로직 구현
- 기존 코드에 영향 없이 기능 확장

## 다음 단계 (선택사항)

### 1. 기존 Service 파일 Deprecation

```typescript
// src/services/auth/auth.service.ts
/**
 * @deprecated Use Auth Use Cases instead
 *
 * Migration guide:
 * - Replace authService.signUp() with SignUpUseCase
 * - Replace authService.signIn() with SignInUseCase
 * - Use factory functions from @/application/factories/authUseCaseFactory
 *
 * @see docs/AUTH_CLEAN_ARCHITECTURE.md
 */
export const authService = { ... }
```

### 2. 컴포넌트 마이그레이션

다음 컴포넌트를 새 아키텍처로 마이그레이션:
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/app/onboarding/page.tsx`

### 3. Invitation 기능 구현

MVP 이후 초대 기능 활성화:
- `invitations` 테이블 생성
- `validate_invitation_token` RPC 함수 구현
- `CompleteStaffOnboardingUseCase` 구현

### 4. 추가 Use Cases

필요시 추가 Use Cases 작성:
- `VerifyEmailUseCase` - 이메일 인증
- `ResendVerificationEmailUseCase` - 인증 이메일 재전송
- `ChangeEmailUseCase` - 이메일 변경
- `DeleteAccountUseCase` - 계정 삭제

## 마이그레이션 체크리스트

- [x] Domain Layer - Value Objects
- [x] Domain Layer - Entities
- [x] Domain Layer - Repository Interfaces
- [x] Infrastructure Layer - Supabase Repositories
- [x] Application Layer - Use Cases
- [x] Application Layer - Factory Functions
- [ ] Presentation Layer - 컴포넌트 마이그레이션
- [ ] 기존 Service 파일 Deprecation
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성

## 참고

- Student/Todo 리팩토링과 동일한 패턴
- `docs/CLEAN_ARCHITECTURE_MIGRATION.md` 참조
- `src/application/README.md` 사용 가이드 참조
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
