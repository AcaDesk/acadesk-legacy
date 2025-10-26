# Solapi 메시징 서비스 통합 가이드

## 개요

Acadesk는 이제 **솔라피(Solapi)** 메시징 서비스를 완전히 지원합니다. 솔라피는 개발자 친화적인 SMS/LMS API를 제공하며, 안정적인 메시지 전송과 합리적인 가격으로 많은 개발자들이 선호하는 서비스입니다.

**최신 업데이트**: Solapi 공식 Node.js SDK를 사용하여 더 간단하고 안정적인 통합을 제공합니다.

## 구현 내역

### 1. 새로운 파일

#### `/src/infra/messaging/SolapiProvider.ts`
- `IMessageProvider` 인터페이스 구현
- **Solapi SDK 사용** - HMAC 인증 자동 처리
- SMS/LMS 자동 구분
- 잔액 조회 및 전달 상태 조회 기능
- **새 기능**: 메시지 이력 조회 (`getMessages`)
- **새 기능**: 통계 조회 (`getStatistics`)

**주요 기능:**
```typescript
class SolapiProvider implements IMessageProvider {
  // 메시지 전송
  async send(request: SendMessageRequest): Promise<SendMessageResponse>

  // 잔액 조회
  async checkBalance(): Promise<{ balance: number; currency: string }>

  // 전달 상태 조회
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatusResponse>

  // 메시지 이력 조회 (새 기능)
  async getMessages(filters?: {
    limit?: number
    messageIds?: string[]
    groupId?: string
    startDate?: Date | string
    endDate?: Date | string
    type?: 'SMS' | 'LMS' | 'MMS'
  })

  // 통계 조회 (새 기능)
  async getStatistics(startDate?: Date | string, endDate?: Date | string)
}
```

### 2. 수정된 파일

#### `/src/app/actions/messaging-config.ts`
- `sendTestMessage()` 함수 업데이트: 실제 메시지 전송 로직 구현
- `createMessagingProvider()` 헬퍼 함수 추가: Provider 인스턴스 생성

**변경 사항:**
- ❌ **이전**: 시뮬레이션만 수행 (실제 발송 X)
- ✅ **현재**: 실제 API를 통해 테스트 메시지 발송

## 설치

### SDK 패키지 설치

```bash
pnpm add solapi
```

또는

```bash
npm install --save solapi
yarn add solapi
bun add solapi
```

## 사용 방법

### 1. 솔라피 계정 설정

1. **회원가입**: [https://solapi.com](https://solapi.com) 방문
2. **발신번호 등록**: 관리자 페이지에서 발신번호 등록 및 인증
3. **API 키 발급**:
   - API Settings → API Key 생성
   - API Key와 API Secret 복사

### 2. Acadesk 설정

1. **설정 페이지 접속**: `/settings/messaging-integration`
2. **서비스 선택**: 드롭다운에서 "솔라피 (Solapi)" 선택
3. **API 인증 정보 입력**:
   - Solapi API Key
   - Solapi API Secret
   - 발신번호 (솔라피에 등록된 번호, 예: `01012345678`)
4. **저장** 버튼 클릭
5. **테스트 메시지 발송**: 본인 전화번호로 테스트
6. **서비스 활성화**: 테스트 성공 후 활성화 토글

### 3. 환경 변수 (선택사항)

프로젝트 전체에서 기본값으로 사용할 경우:

```env
# .env.local
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
SOLAPI_SENDER_PHONE=01012345678
```

**주의**: 전화번호는 하이픈 없이 `01012345678` 형식으로 입력해야 합니다.

## 아키텍처

### Clean Architecture 적용

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  - messaging-integration-client.tsx     │
│  - messaging-config.ts (Server Action)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Application Layer                      │
│  - createMessagingProvider()            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Domain Layer                           │
│  - IMessageProvider (Interface)         │
│  - MessageChannel, SendMessageRequest   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  Infrastructure Layer                   │
│  - SolapiProvider (SDK 사용)            │
│  - AligoProvider (Implementation)       │
└─────────────────────────────────────────┘
```

### 의존성 역전 원칙 (DIP)

- **High-level 모듈**: `sendTestMessage()` Server Action
- **Abstraction**: `IMessageProvider` 인터페이스
- **Low-level 모듈**: `SolapiProvider`, `AligoProvider`

이를 통해 새로운 메시징 서비스 추가가 용이하며, 기존 코드 수정 없이 확장 가능합니다.

## Solapi SDK 사용법

### 기본 초기화

```typescript
import { SolapiMessageService } from 'solapi'

const messageService = new SolapiMessageService(
  "SOLAPI_API_KEY",
  "SOLAPI_API_SECRET"
)
```

SDK가 자동으로 HMAC-SHA256 인증을 처리하므로, 직접 인증 헤더를 생성할 필요가 없습니다.

### 메시지 전송

```typescript
// SMS 발송 (90바이트 이하)
const response = await messageService.send({
  to: '01012345678',
  from: '01087654321',
  text: '안녕하세요'
})

// LMS 발송 (긴 메시지)
const response = await messageService.send({
  to: '01012345678',
  from: '01087654321',
  text: '긴 메시지 내용...',
  subject: '제목'
})
```

### 전화번호 형식

발신번호와 수신번호는 **`01012345678` 형식**으로 요청해야 합니다.
특수문자(+, -, * 등)는 사용할 수 없습니다.

### 메시지 타입 자동 결정

- **SMS**: 90바이트 이하 (한글 45자, 영문 90자)
- **LMS**: 90바이트 초과 (최대 2000자)

```typescript
const bytes = Buffer.byteLength(message, 'utf-8')
const type = bytes <= 90 ? 'SMS' : 'LMS'
```

SDK가 자동으로 메시지 길이에 따라 타입을 결정합니다.

### 잔액 조회

```typescript
const balanceData = await messageService.getBalance()
console.log(`잔액: ${balanceData.balance}원`)
```

### 메시지 이력 조회

```typescript
// 최근 메시지 20개 조회
const messages = await messageService.getMessages({
  limit: 20
})

// 특정 그룹의 메시지 조회
const messages = await messageService.getMessages({
  groupId: 'G4V20250127...'
})

// 날짜 범위로 필터링
const messages = await messageService.getMessages({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  type: 'SMS'
})

// 페이지네이션
const messages = await messageService.getMessages({
  limit: 20,
  startKey: result.nextKey // 이전 조회의 nextKey 사용
})
```

**필터 옵션**:
- `limit`: 조회할 메시지 개수 (기본값: 20)
- `messageIds`: 특정 메시지 ID 배열 (예: `['M4V...', 'M4V...']`)
- `groupId`: 그룹 ID로 필터링 (예: `'G4V...'`)
- `startDate`: 시작 날짜 (Date 객체 또는 문자열)
- `endDate`: 종료 날짜 (Date 객체 또는 문자열)
- `type`: 메시지 타입 (`'SMS'`, `'LMS'`, `'MMS'`)
- `startKey`: 페이지네이션용 커서

### 통계 조회

```typescript
// 전체 통계
const stats = await messageService.getStatistics()

// 특정 기간 통계
const stats = await messageService.getStatistics({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
})
```

## 요금 (예상)

- SMS: 약 8원/건
- LMS: 약 24원/건
- MMS: 약 40원/건
- ※ 실제 요금은 솔라피 플랜에 따라 다릅니다

## 테스트 모드

개발 환경(`NODE_ENV === 'development'`)에서는 실제 API 호출 없이 시뮬레이션:

```typescript
if (isTestMode) {
  console.log('[SolapiProvider TEST MODE] Message would be sent:', {...})
  return {
    success: true,
    messageId: `TEST_SOLAPI_${Date.now()}`,
    cost: 8,
  }
}
```

이를 통해 개발 중에 실제 비용 발생 없이 테스트할 수 있습니다.

## 에러 처리

### 일반적인 에러

1. **인증 실패**: API Key 또는 Secret이 잘못됨
   - 솔라피 관리자 페이지에서 재확인
   - 키를 재발급하고 업데이트

2. **발신번호 미등록**: 발신번호가 솔라피에 등록되지 않음
   - 솔라피에서 발신번호 등록 및 인증 필요
   - 등록 후 최대 1시간 소요될 수 있음

3. **잔액 부족**: 충전 필요
   - 솔라피 관리자 페이지에서 충전
   - 자동 충전 설정 권장

4. **전화번호 형식 오류**: 하이픈이 포함되었거나 형식이 잘못됨
   - `01012345678` 형식으로 변경
   - 특수문자 제거

### 로깅

모든 에러는 서버 로그에 기록됩니다:

```typescript
console.error('[SolapiProvider.send] Error:', error)
console.error('[SolapiProvider.checkBalance] Error:', error)
console.error('[SolapiProvider.getMessages] Error:', error)
```

## 고급 기능

### 예약 발송

```typescript
// 특정 시간에 발송 예약
const response = await messageService.send(
  messageObject,
  '2025-12-07 00:00:00' // 또는 Date 객체
)
```

과거 시간으로 설정하면 즉시 발송됩니다.

### 메시지 유형

SDK는 다양한 메시지 타입을 지원합니다:
- **SMS/LMS/MMS**: 단문/장문/멀티미디어 문자
- **카카오 알림톡**: 템플릿 기반 발송
- **카카오 친구톡**: 텍스트, 버튼, 이미지 지원
- **음성 메시지**: TTS 변환
- **팩스**: 사전 업로드된 문서 발송

현재 Acadesk는 **SMS/LMS**만 지원하며, 향후 카카오 알림톡 등을 추가할 예정입니다.

## 다음 단계

### 1. 카카오 알림톡 지원 (예정)

알림톡 템플릿을 등록하고 발송하는 기능 추가

### 2. NHN Cloud 지원 (예정)

현재 NHN Cloud Provider는 미구현 상태입니다:

```typescript
case 'nhncloud': {
  // TODO: Implement NHN Cloud provider
  console.warn('[createMessagingProvider] NHN Cloud provider not implemented yet')
  return null
}
```

NHN Cloud를 지원하려면 `/src/infra/messaging/NHNCloudProvider.ts` 파일을 생성하여 동일한 패턴으로 구현하면 됩니다.

### 3. 메시지 이력 UI (예정)

`getMessages()` API를 활용한 발송 이력 조회 페이지 추가

### 4. 통계 대시보드 (예정)

`getStatistics()` API를 활용한 발송 통계 대시보드 추가

## 참고 자료

- [Solapi 공식 문서](https://docs.solapi.com)
- [Solapi Node.js SDK 가이드](https://developers.solapi.com/sdk-list/Node.js)
- [Solapi API 레퍼런스](https://docs.solapi.com/api-reference/messages)
- [Solapi 관리자 페이지](https://console.solapi.com)
- [Solapi GitHub Repository](https://github.com/solapi)

## 기여

새로운 메시징 Provider를 추가하려면:

1. `/src/infra/messaging/YourProvider.ts` 생성
2. `IMessageProvider` 인터페이스 구현
3. `/src/app/actions/messaging-config.ts`의 `createMessagingProvider()` 함수에 추가
4. UI에서 Provider 선택 옵션 추가 (이미 Solapi는 추가되어 있음)

## 변경 이력

### 2025-01-27
- ✨ **Solapi SDK 통합** - REST API에서 공식 SDK로 전환
- ✨ **메시지 이력 조회** (`getMessages`) 추가
- ✨ **통계 조회** (`getStatistics`) 추가
- 🔨 HMAC 인증 로직 제거 (SDK가 자동 처리)
- 📝 문서 업데이트 - SDK 사용법 추가

### 2025-01-XX (이전)
- ✨ Solapi Provider 추가
- 🔨 sendTestMessage 실제 API 호출 구현
- 📝 초기 문서 작성
