# Solapi 메시징 서비스 통합 가이드

## 개요

Acadesk는 이제 **솔라피(Solapi)** 메시징 서비스를 완전히 지원합니다. 솔라피는 개발자 친화적인 SMS/LMS API를 제공하며, 안정적인 메시지 전송과 합리적인 가격으로 많은 개발자들이 선호하는 서비스입니다.

## 구현 내역

### 1. 새로운 파일

#### `/src/infra/messaging/SolapiProvider.ts`
- `IMessageProvider` 인터페이스 구현
- HMAC-SHA256 인증 지원
- SMS/LMS 자동 구분
- 잔액 조회 및 전달 상태 조회 기능

**주요 기능:**
```typescript
class SolapiProvider implements IMessageProvider {
  // 메시지 전송
  async send(request: SendMessageRequest): Promise<SendMessageResponse>

  // 잔액 조회
  async checkBalance(): Promise<{ balance: number; currency: string }>

  // 전달 상태 조회
  async getDeliveryStatus(messageId: string): Promise<DeliveryStatusResponse>
}
```

### 2. 수정된 파일

#### `/src/app/actions/messaging-config.ts`
- `sendTestMessage()` 함수 업데이트: 실제 메시지 전송 로직 구현
- `createMessagingProvider()` 헬퍼 함수 추가: Provider 인스턴스 생성

**변경 사항:**
- ❌ **이전**: 시뮬레이션만 수행 (실제 발송 X)
- ✅ **현재**: 실제 API를 통해 테스트 메시지 발송

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
   - 발신번호 (솔라피에 등록된 번호)
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
│  - SolapiProvider (Implementation)      │
│  - AligoProvider (Implementation)       │
└─────────────────────────────────────────┘
```

### 의존성 역전 원칙 (DIP)

- **High-level 모듈**: `sendTestMessage()` Server Action
- **Abstraction**: `IMessageProvider` 인터페이스
- **Low-level 모듈**: `SolapiProvider`, `AligoProvider`

이를 통해 새로운 메시징 서비스 추가가 용이하며, 기존 코드 수정 없이 확장 가능합니다.

## Solapi API 상세

### 인증 방식: HMAC-SHA256

솔라피는 요청마다 HMAC 서명을 요구합니다:

```typescript
// 서명 생성
const date = new Date().toISOString()
const salt = crypto.randomBytes(16).toString('hex')
const stringToSign = `${date}${salt}`
const signature = crypto
  .createHmac('sha256', apiSecret)
  .update(stringToSign)
  .digest('hex')

// Authorization 헤더
Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`
```

### 메시지 타입 자동 결정

- **SMS**: 90바이트 이하
- **LMS**: 90바이트 초과

```typescript
const bytes = Buffer.byteLength(message, 'utf-8')
const type = bytes <= 90 ? 'SMS' : 'LMS'
```

### 요금 (예상)

- SMS: 약 8원/건
- LMS: 약 24원/건
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

## 에러 처리

### 일반적인 에러

1. **인증 실패**: API Key 또는 Secret이 잘못됨
   - 솔라피 관리자 페이지에서 재확인

2. **발신번호 미등록**: 발신번호가 솔라피에 등록되지 않음
   - 솔라피에서 발신번호 등록 및 인증 필요

3. **잔액 부족**: 충전 필요
   - 솔라피 관리자 페이지에서 충전

### 로깅

모든 에러는 서버 로그에 기록됩니다:

```typescript
console.error('[SolapiProvider.send] Error:', error)
```

## 다음 단계

### NHN Cloud 지원

현재 NHN Cloud Provider는 미구현 상태입니다:

```typescript
case 'nhncloud': {
  // TODO: Implement NHN Cloud provider
  console.warn('[createMessagingProvider] NHN Cloud provider not implemented yet')
  return null
}
```

NHN Cloud를 지원하려면 `/src/infra/messaging/NHNCloudProvider.ts` 파일을 생성하여 동일한 패턴으로 구현하면 됩니다.

## 참고 자료

- [Solapi 공식 문서](https://docs.solapi.com)
- [Solapi API 레퍼런스](https://docs.solapi.com/api-reference/messages)
- [Solapi 관리자 페이지](https://console.solapi.com)

## 기여

새로운 메시징 Provider를 추가하려면:

1. `/src/infra/messaging/YourProvider.ts` 생성
2. `IMessageProvider` 인터페이스 구현
3. `/src/app/actions/messaging-config.ts`의 `createMessagingProvider()` 함수에 추가
4. UI에서 Provider 선택 옵션 추가 (이미 Solapi는 추가되어 있음)

## 변경 이력

### 2025-01-XX
- ✨ Solapi Provider 추가
- 🔨 sendTestMessage 실제 API 호출 구현
- 📝 문서 작성
