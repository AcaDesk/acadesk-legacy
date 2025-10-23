"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog"
import { ScrollArea } from "@ui/scroll-area"

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "terms" | "privacy"
}

export function TermsModal({ open, onOpenChange, type }: TermsModalProps) {
  const isTerms = type === "terms"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isTerms ? "이용약관" : "개인정보처리방침"}
          </DialogTitle>
          <DialogDescription>
            {isTerms
              ? "Acadesk 서비스 이용약관을 확인해주세요."
              : "Acadesk 개인정보처리방침을 확인해주세요."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            {isTerms ? <TermsContent /> : <PrivacyContent />}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function TermsContent() {
  return (
    <>
      <section>
        <h3 className="mb-2 font-semibold">제1조 (목적)</h3>
        <p className="text-muted-foreground">
          본 약관은 Acadesk(이하 &quot;회사&quot;)가 제공하는 학원 관리 서비스(이하
          &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항,
          기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제2조 (정의)</h3>
        <p className="text-muted-foreground">
          1. &quot;서비스&quot;란 회사가 제공하는 학원 관리 솔루션 및 관련 제반 서비스를
          의미합니다.
          <br />
          2. &quot;이용자&quot;란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및
          비회원을 말합니다.
          <br />
          3. &quot;회원&quot;이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의
          정보를 지속적으로 제공받으며 회사가 제공하는 서비스를 계속적으로 이용할
          수 있는 자를 말합니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제3조 (약관의 효력 및 변경)</h3>
        <p className="text-muted-foreground">
          1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을
          발생합니다.
          <br />
          2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을
          변경할 수 있으며, 약관이 변경되는 경우 지체 없이 &quot;공지사항&quot;을 통해
          공지합니다.
          <br />
          3. 이용자가 변경된 약관에 동의하지 않는 경우, 이용자는 서비스 이용을
          중단하고 이용계약을 해지할 수 있습니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제4조 (회원가입)</h3>
        <p className="text-muted-foreground">
          1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에
          동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
          <br />
          2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각
          호에 해당하지 않는 한 회원으로 등록합니다.
          <br />
          &nbsp;&nbsp;가. 가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한
          적이 있는 경우
          <br />
          &nbsp;&nbsp;나. 등록 내용에 허위, 기재누락, 오기가 있는 경우
          <br />
          &nbsp;&nbsp;다. 기타 회원으로 등록하는 것이 회사의 기술상 현저히
          지장이 있다고 판단되는 경우
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제5조 (서비스의 제공 및 변경)</h3>
        <p className="text-muted-foreground">
          1. 회사는 이용자에게 아래와 같은 서비스를 제공합니다.
          <br />
          &nbsp;&nbsp;가. 학원 관리 솔루션 제공
          <br />
          &nbsp;&nbsp;나. 학생 및 학부모 관리 기능
          <br />
          &nbsp;&nbsp;다. 출석 및 성적 관리 기능
          <br />
          &nbsp;&nbsp;라. 기타 회사가 추가 개발하거나 다른 회사와의 제휴계약 등을
          통해 이용자에게 제공하는 일체의 서비스
          <br />
          2. 회사는 상당한 이유가 있는 경우에 운영상, 기술상의 필요에 따라
          제공하고 있는 전부 또는 일부 서비스를 변경할 수 있습니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제6조 (서비스의 중단)</h3>
        <p className="text-muted-foreground">
          1. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절
          등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수
          있습니다.
          <br />
          2. 회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여
          이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 회사에 고의 또는
          과실이 없음을 입증하는 경우에는 그러하지 아니합니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제7조 (이용자의 의무)</h3>
        <p className="text-muted-foreground">
          1. 이용자는 다음 행위를 하여서는 안 됩니다.
          <br />
          &nbsp;&nbsp;가. 신청 또는 변경 시 허위내용의 등록
          <br />
          &nbsp;&nbsp;나. 타인의 정보도용
          <br />
          &nbsp;&nbsp;다. 회사가 게시한 정보의 변경
          <br />
          &nbsp;&nbsp;라. 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의
          송신 또는 게시
          <br />
          &nbsp;&nbsp;마. 회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해
          <br />
          &nbsp;&nbsp;바. 회사 및 기타 제3자의 명예를 손상시키거나 업무를
          방해하는 행위
          <br />
          &nbsp;&nbsp;사. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에
          반하는 정보를 공개 또는 게시하는 행위
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제8조 (면책조항)</h3>
        <p className="text-muted-foreground">
          1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할
          수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
          <br />
          2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을
          지지 않습니다.
          <br />
          3. 회사는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여
          책임을 지지 않으며, 그 밖에 서비스를 통하여 얻은 자료로 인한 손해에
          관하여 책임을 지지 않습니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">제9조 (관할법원)</h3>
        <p className="text-muted-foreground">
          서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 회사의 본사
          소재지를 관할하는 법원을 관할 법원으로 합니다.
        </p>
      </section>

      <section className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          본 약관은 2025년 1월 1일부터 시행됩니다.
        </p>
      </section>
    </>
  )
}

function PrivacyContent() {
  return (
    <>
      <section>
        <h3 className="mb-2 font-semibold">1. 개인정보의 수집 및 이용 목적</h3>
        <p className="text-muted-foreground">
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는
          개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
          변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는
          등 필요한 조치를 이행할 예정입니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공</li>
          <li>서비스 제공: 학원 관리 서비스 제공, 콘텐츠 제공</li>
          <li>마케팅 및 광고: 이벤트 및 광고성 정보 제공 (선택)</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">2. 수집하는 개인정보 항목</h3>
        <p className="text-muted-foreground">
          회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를
          수집하고 있습니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>
            필수항목: 이름, 이메일 주소, 비밀번호, 연락처, 학원명(원장/강사의
            경우)
          </li>
          <li>선택항목: 프로필 사진, 주소</li>
          <li>
            자동수집 항목: IP주소, 쿠키, 서비스 이용 기록, 방문 기록, 불량 이용
            기록
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">3. 개인정보의 보유 및 이용 기간</h3>
        <p className="text-muted-foreground">
          회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를
          수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
          <li>
            관계 법령에 의한 정보보유 사유:
            <ul className="mt-1 ml-4 list-circle">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
            </ul>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">4. 개인정보의 제3자 제공</h3>
        <p className="text-muted-foreground">
          회사는 정보주체의 동의, 법률의 특별한 규정 등 &quot;개인정보 보호법&quot; 제17조
          및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
        </p>
        <p className="mt-2 text-muted-foreground">
          현재 회사는 개인정보를 제3자에게 제공하고 있지 않습니다.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">5. 개인정보 처리의 위탁</h3>
        <p className="text-muted-foreground">
          회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를
          위탁하고 있습니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>수탁업체: Supabase (데이터베이스 호스팅)</li>
          <li>위탁업무 내용: 회원 데이터 저장 및 관리</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">6. 정보주체의 권리·의무 및 행사방법</h3>
        <p className="text-muted-foreground">
          정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를
          행사할 수 있습니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>개인정보 열람 요구</li>
          <li>오류 등이 있을 경우 정정 요구</li>
          <li>삭제 요구</li>
          <li>처리정지 요구</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">7. 개인정보의 파기</h3>
        <p className="text-muted-foreground">
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게
          되었을 때에는 지체없이 해당 개인정보를 파기합니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>파기절차: 불필요한 개인정보는 별도의 DB로 옮겨져 법령에 따라 일정 기간 저장된 후 파기됩니다.</li>
          <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">8. 개인정보 보호책임자</h3>
        <p className="text-muted-foreground">
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
          관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보
          보호책임자를 지정하고 있습니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>성명: Acadesk 개인정보보호팀</li>
          <li>이메일: privacy@acadesk.com</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">9. 개인정보의 안전성 확보조치</h3>
        <p className="text-muted-foreground">
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
        </p>
        <ul className="mt-2 ml-4 list-disc text-muted-foreground">
          <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육</li>
          <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
          <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
        </ul>
      </section>

      <section className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          본 개인정보처리방침은 2025년 1월 1일부터 시행됩니다.
        </p>
      </section>
    </>
  )
}
