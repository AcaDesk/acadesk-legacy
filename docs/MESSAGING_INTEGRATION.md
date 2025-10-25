# 프로세스 연동형 메시징 시스템 통합 가이드

## 개요

Acadesk의 메시징 시스템은 **"프로세스 연동형 소통(Process-Integrated Communication)"** 철학을 따릅니다.

원장님이 별도의 "메시지 전송" 페이지로 이동하는 것이 아니라, **현재 보고 있는 화면에서 바로** 학부모님께 SMS/알림톡을 보낼 수 있도록 설계되었습니다.

**참고**: Acadesk는 프로그램명입니다. 실제 발송되는 메시지에는 `{학원이름}` 변수를 사용하여 각 학원의 이름이 표시됩니다.

## 핵심 컴포넌트

### 1. SendMessageDialog (프로세스 연동형)

각 업무 프로세스에서 바로 사용하는 간편한 발송 모달입니다.

**위치**: `/src/components/features/messaging/send-message-dialog.tsx`

**Props**:
```typescript
interface SendMessageDialogProps {
  open: boolean                          // 다이얼로그 열림 상태
  onOpenChange: (open: boolean) => void  // 상태 변경 핸들러
  recipients: Recipient[]                // 수신인 목록
  defaultTemplate?: string               // 기본 템플릿 ID
  context?: Record<string, string>       // 변수 자동 치환용 데이터
  onSuccess?: () => void                 // 전송 성공 콜백
}
```

**특징**:
- ✅ 알림톡/SMS 채널 선택
- ✅ 템플릿 기반 메시지 (자동 변수 치환)
- ✅ 실시간 미리보기
- ✅ 예상 비용 계산
- ✅ 전송 전 확인 및 편집

### 2. BulkMessageDialog (일괄 발송용)

학생을 직접 선택하여 대량으로 메시지를 발송하는 모달입니다.

**위치**: `/src/components/features/notifications/bulk-message-dialog.tsx`

**Props**:
```typescript
interface BulkMessageDialogProps {
  open: boolean                          // 다이얼로그 열림 상태
  onOpenChange: (open: boolean) => void  // 상태 변경 핸들러
  onMessageSent?: () => void             // 전송 성공 콜백
}
```

**특징**:
- ✅ 학생 검색 및 선택 기능
- ✅ 전체 선택/해제
- ✅ 템플릿 사용 가능
- ✅ SMS/알림톡 전용 (이메일 기능 제거)
- ✅ 장문 SMS 자동 감지

**사용 위치**: `/notifications` (메시지 관리 페이지)

## 통합 패턴

### 패턴 1: 1:1 상황별 알림 (출석부)

**사용 사례**: 출석 체크 시 결석/지각 학생의 학부모에게 즉시 알림

**구현 예시**: `/src/app/(dashboard)/attendance/daily/daily-attendance-client.tsx`

```tsx
'use client'

import { useState } from 'react'
import { SendMessageDialog } from '@/components/features/messaging/send-message-dialog'

export function DailyAttendanceClient() {
  const [messageDialog, setMessageDialog] = useState({
    open: false,
    recipients: [],
    template: '',
    context: {},
  })

  function sendAbsentNotification(student, classInfo) {
    setMessageDialog({
      open: true,
      recipients: [{
        id: student.id,
        name: student.guardian_name,
        phone: student.guardian_phone,
        studentName: student.name,
      }],
      template: 'attendance_absent',  // 결석 알림 템플릿
      context: {
        학생이름: student.name,
        날짜: new Date().toLocaleDateString('ko-KR'),
        시간: classInfo.time,
      },
    })
  }

  return (
    <>
      {/* 결석 처리 시 알림 버튼 표시 */}
      {student.attendance_status === 'absent' && (
        <Button onClick={() => sendAbsentNotification(student, classInfo)}>
          <Bell className="h-4 w-4 mr-2" />
          결석 알림
        </Button>
      )}

      {/* 메시지 발송 다이얼로그 */}
      <SendMessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog({ ...messageDialog, open })}
        recipients={messageDialog.recipients}
        defaultTemplate={messageDialog.template}
        context={messageDialog.context}
        onSuccess={() => {
          toast({ title: '알림 전송 완료' })
        }}
      />
    </>
  )
}
```

**워크플로우**:
1. 강사가 학생을 "결석" 처리
2. `[🔔 결석 알림]` 버튼이 즉시 활성화
3. 버튼 클릭 시 모달이 열리며, 학생 정보가 자동으로 채워짐
4. `[전송하기]` 버튼 한 번으로 알림 발송

**수동 발송 옵션**:
모든 학생 행에 항상 표시되는 메시지 아이콘 버튼 (`MessageSquare`) 제공:
- 출석 상태와 무관하게 언제든지 사용 가능
- 클릭 시 "직접 입력" 모드로 다이얼로그 오픈
- 자유로운 메시지 작성 가능

```tsx
function sendCustomMessage(student: Student) {
  setMessageDialog({
    open: true,
    recipients: [{
      id: student.id,
      name: student.guardian_name,
      phone: student.guardian_phone,
      studentName: student.name,
    }],
    template: 'custom',  // 직접 입력 모드
    context: {},
  })
}

// UI 버튼 (항상 표시)
<Button
  variant="ghost"
  size="sm"
  onClick={() => sendCustomMessage(student)}
  title="직접 메시지 작성하기"
>
  <MessageSquare className="h-4 w-4" />
</Button>
```

---

### 패턴 2: 1:N 일괄 처리 (학원비 관리)

**사용 사례**: 미납 학생 여러 명에게 한 번에 안내 발송

**구현 예시**:

```tsx
'use client'

export function PaymentsClient({ students }) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [messageDialog, setMessageDialog] = useState({
    open: false,
    recipients: [],
    template: '',
    context: {},
  })

  function sendBulkOverdueNotification() {
    const selected = students.filter(s => selectedStudents.has(s.id))

    setMessageDialog({
      open: true,
      recipients: selected.map(s => ({
        id: s.id,
        name: s.guardian_name,
        phone: s.guardian_phone,
        studentName: s.name,
      })),
      template: 'payment_overdue',  // 학원비 미납 안내 템플릿
      context: {
        월: new Date().getMonth() + 1,
        // 각 학생별로 금액이 다른 경우, 개별 발송 처리 필요
      },
    })
  }

  return (
    <>
      {/* 체크박스로 학생 선택 */}
      <Table>
        {students.map(student => (
          <TableRow key={student.id}>
            <TableCell>
              <Checkbox
                checked={selectedStudents.has(student.id)}
                onCheckedChange={(checked) => {
                  const newSet = new Set(selectedStudents)
                  if (checked) {
                    newSet.add(student.id)
                  } else {
                    newSet.delete(student.id)
                  }
                  setSelectedStudents(newSet)
                }}
              />
            </TableCell>
            <TableCell>{student.name}</TableCell>
            <TableCell>{student.overdue_amount}원</TableCell>
          </TableRow>
        ))}
      </Table>

      {/* 선택된 학생이 있을 때만 버튼 활성화 */}
      {selectedStudents.size > 0 && (
        <Button onClick={sendBulkOverdueNotification}>
          <Bell className="h-4 w-4 mr-2" />
          선택한 {selectedStudents.size}명에게 미납 안내 발송
        </Button>
      )}

      <SendMessageDialog {...messageDialog} />
    </>
  )
}
```

**워크플로우**:
1. 원장님이 미납 학생 5명을 체크박스로 선택
2. `[선택한 5명에게 미납 안내 발송]` 버튼 클릭
3. 모달이 열리며, 5명의 학부모 정보가 자동 세팅
4. 템플릿이 "학원비 미납 안내"로 자동 선택
5. 한 번에 5건 발송

---

### 패턴 3: 작업 완료 후 전송 (리포트)

**사용 사례**: 리포트 작성 완료 후 학부모에게 발송

**구현 예시**:

```tsx
'use client'

export function ReportDetailClient({ report, student }) {
  const [messageDialog, setMessageDialog] = useState({
    open: false,
    recipients: [],
    template: '',
    context: {},
  })

  async function handleSaveAndSend() {
    // 1. 리포트 저장
    await saveReport(report)

    // 2. 전송 다이얼로그 열기
    setMessageDialog({
      open: true,
      recipients: [{
        id: student.guardian_id,
        name: student.guardian_name,
        phone: student.guardian_phone,
        studentName: student.name,
      }],
      template: 'report_sent',  // 리포트 발송 템플릿
      context: {
        학생이름: student.name,
        기간: report.period,
      },
    })
  }

  return (
    <>
      <Button onClick={handleSaveAndSend}>
        <Send className="h-4 w-4 mr-2" />
        저장하고 학부모에게 전송
      </Button>

      <SendMessageDialog {...messageDialog} />
    </>
  )
}
```

**워크플로우**:
1. 강사가 리포트 작성 완료
2. `[저장하고 학부모에게 전송]` 버튼 클릭
3. 리포트 저장 + 전송 모달 자동 오픈
4. 확인 후 전송

---

## 템플릿 관리

### 템플릿 관리 페이지

**위치**: `/settings/message-templates`

**기능**:
- ✅ 자주 사용하는 메시지 템플릿 생성/수정/삭제
- ✅ 변수 지정 (예: `{학생이름}`, `{금액}`, `{날짜}`)
- ✅ 카테고리별 분류 (출결, 학원비, 리포트, 상담, 일반)
- ✅ 알림톡/SMS 채널 선택
- ✅ 활성/비활성 상태 관리

### 기본 제공 템플릿

| ID | 이름 | 분류 | 변수 |
|---|---|---|---|
| `attendance_absent` | 결석 알림 | 출결 | `{학생이름}`, `{날짜}`, `{시간}` |
| `attendance_late` | 지각 알림 | 출결 | `{학생이름}`, `{시간}`, `{지각시간}` |
| `payment_overdue` | 학원비 미납 안내 | 학원비 | `{학생이름}`, `{월}`, `{금액}` |
| `report_sent` | 리포트 발송 | 리포트 | `{학생이름}`, `{기간}` |
| `consultation_reminder` | 상담 일정 안내 | 상담 | `{학생이름}`, `{날짜}`, `{시간}` |

---

## 변수 자동 치환 메커니즘

템플릿에 `{변수명}` 형식으로 작성된 변수는 `context` prop으로 전달된 값으로 자동 치환됩니다.

**예시**:

```tsx
// 템플릿 내용
"안녕하세요, Acadesk입니다.\n{학생이름} 학생의 {월}월 학원비 {금액}원이 미납되었습니다."

// context 전달
context={{
  학생이름: '김철수',
  월: '10',
  금액: '250,000',
}}

// 최종 메시지
"안녕하세요, Acadesk입니다.\n김철수 학생의 10월 학원비 250,000원이 미납되었습니다."
```

---

## 체크리스트: 새 페이지에 메시징 통합하기

1. **[ ]** SendMessageDialog 컴포넌트 import
2. **[ ]** 메시지 다이얼로그 상태 관리 (`useState`)
3. **[ ]** 수신인 정보 준비 (학부모 이름, 전화번호)
4. **[ ]** 적절한 템플릿 ID 선택
5. **[ ]** context 객체로 변수 값 전달
6. **[ ]** 버튼 UI 추가 (맥락에 맞는 위치)
7. **[ ]** SendMessageDialog 렌더링
8. **[ ]** onSuccess 콜백 처리 (toast 메시지 등)

---

## 셀프 서비스 API 키 관리

### 개요

Acadesk는 **원장님이 직접 메시징 서비스 API 키를 등록**하는 B2B SaaS 모델을 채택합니다.

**장점:**
- ✅ **확장성**: 개발자가 매번 수동으로 키를 등록할 필요 없음
- ✅ **비용 분리**: 발송 비용이 각 원장님의 계정에서 직접 차감
- ✅ **법적 책임 분리**: 발신번호 등록 및 스팸 책임이 API 키 소유자에게 귀속
- ✅ **유연성**: 원장님이 선호하는 서비스(알리고/솔라피/NHN Cloud) 선택 가능

### 워크플로우

1. **원장님**: 메시징 서비스 가입 → 발신번호 등록·인증 → API 키 발급
2. **원장님**: Acadesk 설정 페이지(`/settings/messaging-integration`)에서 API 키 입력
3. **Acadesk**: 테스트 메시지 발송으로 설정 검증
4. **원장님**: 서비스 활성화 → 실제 메시지 발송 시작

### 설정 페이지

**위치**: `/settings/messaging-integration`

**기능**:
- 메시징 서비스 제공사 선택 (알리고/솔라피/NHN Cloud)
- API 인증 정보 입력 (User ID, API Key, 발신번호)
- 테스트 메시지 발송 및 인증
- 서비스 활성화/비활성화 토글
- 설정 삭제

**Server Actions**: `/src/app/actions/messaging-config.ts`
- `getMessagingConfig()` - 현재 설정 조회
- `saveMessagingConfig(input)` - 설정 저장/업데이트
- `sendTestMessage(phoneNumber)` - 테스트 메시지 발송
- `toggleMessagingActive(isActive)` - 서비스 활성화 토글
- `deleteMessagingConfig()` - 설정 삭제

**Database**: `tenant_messaging_config` 테이블
- 각 tenant별 메시징 서비스 설정 저장
- API 키는 암호화되어 저장 (TODO: 암호화 구현 필요)
- RLS 정책으로 tenant 격리

### 지원 서비스

#### 1. 알리고 (Aligo)
- **가입**: https://smartsms.aligo.in/join.html
- **API 문서**: https://smartsms.aligo.in/admin/api/spec.html
- **필요 정보**: User ID, API Key, 발신번호

#### 2. 솔라피 (Solapi)
- **가입**: https://solapi.com
- **API 문서**: https://docs.solapi.com
- **필요 정보**: API Key, API Secret, 발신번호

#### 3. NHN Cloud
- **가입**: https://www.nhncloud.com
- **API 문서**: https://docs.nhncloud.com
- **필요 정보**: App Key, Secret Key, 발신번호

---

## 다음 단계

### 미구현 기능

1. **[ ]** 실제 메시지 발송 API 연동
   - 알리고/솔라피/NHN Cloud API 호출 Provider 레이어 구현
   - Tenant credentials 사용하여 발송
   - 실패 시 자동 SMS 재전송 (알림톡 → SMS fallback)

2. **[✅]** 템플릿 CRUD 기능 (완료)
   - 템플릿 생성/수정/삭제 Server Actions
   - Database 마이그레이션 (message_templates 테이블)

3. **[ ]** API 키 암호화
   - tenant_messaging_config 테이블의 민감한 정보 암호화
   - 암호화/복호화 유틸리티 함수

4. **[ ]** 발송 이력 관리
   - 발송 성공/실패 로그
   - 발송 이력 조회 페이지
   - 재발송 기능

5. **[ ]** 비용 관리
   - 실제 발송 비용 계산 (provider별)
   - 월별 발송 현황 대시보드
   - 예산 초과 알림

---

## 참고

- **메시지 전송 UI 데모**: `/attendance/daily` (일일 출석부)
- **템플릿 관리 UI**: `/settings/message-templates`
- **컴포넌트 위치**: `/src/components/features/messaging/send-message-dialog.tsx`

모든 기능은 **UI가 먼저 구성**되어 있으며, 실제 발송 API 연동은 추후 진행 예정입니다.
