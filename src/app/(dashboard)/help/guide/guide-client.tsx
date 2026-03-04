'use client'

import { useState, useMemo } from 'react'
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Search,
  FileText,
  X,
  Users,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Smartphone,
  MessageSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { Input } from '@ui/input'
import { Button } from '@ui/button'
import { cn } from '@/lib/utils'
import { PwaInstallGuide } from '@/components/features/help/pwa-install-guide'

// ─── Types ───

interface GuideArticle {
  id: string
  title: string
}

interface GuideSection {
  id: string
  title: string
  icon: LucideIcon
  articles: GuideArticle[]
}

// ─── Guide sections ───

const sections: GuideSection[] = [
  {
    id: 'getting-started',
    title: '시작하기',
    icon: BookOpen,
    articles: [
      { id: 'account-setup', title: '계정 생성 및 로그인' },
      { id: 'academy-setup', title: '학원 기본 설정' },
      { id: 'invite-staff', title: '직원 초대하기' },
    ],
  },
  {
    id: 'students',
    title: '학생 관리',
    icon: Users,
    articles: [
      { id: 'register-student', title: '신규 학생 등록' },
      { id: 'bulk-import', title: '엑셀 일괄 등록' },
      { id: 'student-detail', title: '학생 상세 정보' },
    ],
  },
  {
    id: 'attendance',
    title: '출석 관리',
    icon: Calendar,
    articles: [
      { id: 'daily-attendance', title: '일일 출석 체크' },
      { id: 'kiosk-mode', title: '키오스크 모드' },
      { id: 'contact-guardian', title: '보호자 연락' },
    ],
  },
  {
    id: 'grades',
    title: '성적 관리',
    icon: BarChart3,
    articles: [
      { id: 'create-exam', title: '시험 및 성적 입력' },
      { id: 'grade-trends', title: '성적 추이 확인' },
    ],
  },
  {
    id: 'todos',
    title: 'TODO 관리',
    icon: ClipboardCheck,
    articles: [
      { id: 'assign-todo', title: '과제 배정하기' },
      { id: 'verify-todo', title: '과제 검증' },
      { id: 'todo-templates', title: '템플릿 활용' },
    ],
  },
  {
    id: 'reports',
    title: '리포트 · 상담',
    icon: MessageSquare,
    articles: [
      { id: 'monthly-report', title: '월간 리포트' },
      { id: 'consultation', title: '상담 기록 관리' },
    ],
  },
  {
    id: 'settings',
    title: '설정',
    icon: Settings,
    articles: [
      { id: 'subjects', title: '과목 관리' },
      { id: 'classes', title: '수업(반) 관리' },
    ],
  },
  {
    id: 'pwa',
    title: '앱 설치',
    icon: Smartphone,
    articles: [
      { id: 'pwa-install', title: 'PWA 설치 안내' },
    ],
  },
]

// ─── Helpers ───

/** 스크린샷 placeholder */
function Screenshot({ description }: { description: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 px-4 py-12 md:py-16">
      <p className="text-center text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

/** 정보 박스 */
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/50 p-5 mb-6">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}

// ─── Flat index for navigation ───

const allArticles = sections.flatMap((s) =>
  s.articles.map((a) => ({ ...a, sectionId: s.id, sectionTitle: s.title }))
)

function getArticleIndex(articleId: string) {
  return allArticles.findIndex((a) => a.id === articleId)
}

// ─── Article content ───

function ArticleContent({ articleId }: { articleId: string }) {
  switch (articleId) {
    // ── 시작하기 ──
    case 'account-setup':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Acadesk를 시작하려면 먼저 계정을 만들어야 합니다. 이메일 주소만 있으면 바로 가입할 수 있으며, 가입 후 학원을 생성하면 모든 기능을 사용할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">1. 회원가입</h2>
          <p className="text-muted-foreground mb-4">
            홈 페이지에서 <strong className="text-foreground">&quot;시작하기&quot;</strong> 버튼을 클릭하세요. 이메일과 비밀번호를 입력하면 인증 메일이 발송됩니다.
          </p>
          <Screenshot description="[스크린샷: 회원가입 페이지]" />
          <h2 className="text-xl font-bold mb-3 mt-8">2. 이메일 인증</h2>
          <p className="text-muted-foreground mb-4">
            수신된 이메일의 인증 링크를 클릭하면 계정이 활성화됩니다. 이메일이 도착하지 않으면 스팸함을 확인해 주세요.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">3. 학원(테넌트) 생성</h2>
          <p className="text-muted-foreground mb-4">
            첫 로그인 시 학원 이름을 입력하여 학원을 생성합니다. 학원이 생성되면 해당 학원의 <strong className="text-foreground">원장(Owner)</strong> 권한이 부여됩니다.
          </p>
          <Screenshot description="[스크린샷: 학원 생성 화면]" />
        </>
      )

    case 'academy-setup':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학원을 생성한 후 기본 설정을 완료하면 학생 관리, 출석 체크 등의 기능을 바로 사용할 수 있습니다. 아래 순서로 설정하는 것을 권장합니다.
          </p>
          <InfoBox>
            <strong className="text-foreground">권장 설정 순서</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>과목 등록 (수학, 영어, 국어 등)</li>
              <li>수업(반) 생성 및 시간표 설정</li>
              <li>학생 등록 및 수업 배정</li>
            </ol>
          </InfoBox>
          <h2 className="text-xl font-bold mb-3 mt-8">과목 등록</h2>
          <p className="text-muted-foreground mb-4">
            <strong className="text-foreground">설정 &gt; 과목 관리</strong>에서 학원에서 가르치는 과목을 등록합니다. 각 과목에 색상을 지정하면 시간표, 성적 등에서 시각적으로 구분됩니다.
          </p>
          <Screenshot description="[스크린샷: 과목 관리 페이지 — 과목 추가 화면]" />
          <h2 className="text-xl font-bold mb-3 mt-8">수업(반) 생성</h2>
          <p className="text-muted-foreground mb-4">
            <strong className="text-foreground">설정 &gt; 수업 관리</strong>에서 수업을 만들고 요일과 시간을 설정합니다. 학생은 수업 단위로 배정되며, 출석도 수업별로 관리됩니다.
          </p>
          <Screenshot description="[스크린샷: 수업 관리 페이지 — 수업 생성 폼]" />
        </>
      )

    case 'invite-staff':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            함께 일하는 강사와 직원을 학원에 초대하여 역할에 맞는 권한을 부여할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">역할별 권한</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">역할</th>
                  <th className="text-left py-2 pr-4 font-semibold">주요 권한</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">원장 (Owner)</td>
                  <td className="py-2">모든 기능, 직원 관리, 학원 설정</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">강사 (Instructor)</td>
                  <td className="py-2">학생, 출석, 성적, TODO, 상담 관리</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">조교 (Assistant)</td>
                  <td className="py-2">출석 체크, TODO 확인 등 보조 업무</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h2 className="text-xl font-bold mb-3 mt-8">초대 방법</h2>
          <p className="text-muted-foreground mb-4">
            현재는 직원이 먼저 Acadesk에 회원가입한 뒤, 원장이 해당 직원을 학원에 초대하는 방식입니다. 초대된 직원은 자동으로 역할이 부여됩니다.
          </p>
        </>
      )

    // ── 학생 관리 ──
    case 'register-student':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생을 등록하면 출석, 성적, TODO 등 모든 학습 관리의 기본 단위가 됩니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">등록 절차</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>좌측 메뉴에서 <strong className="text-foreground">&quot;학생 관리&quot;</strong>를 클릭합니다.</li>
            <li>우측 상단의 <strong className="text-foreground">&quot;학생 추가&quot;</strong> 버튼을 클릭합니다.</li>
            <li>학생 기본 정보(이름, 학교, 학년, 연락처)를 입력합니다.</li>
            <li>수업(반)을 선택하여 배정합니다.</li>
            <li><strong className="text-foreground">&quot;저장&quot;</strong>을 클릭하면 자동으로 학생 코드가 생성됩니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 학생 추가 폼 — 기본 정보 입력 화면]" />
          <InfoBox>
            <strong className="text-foreground">학생 코드란?</strong>
            <p className="mt-1">각 학생에게 자동으로 부여되는 고유 코드입니다. 키오스크에서 학생이 본인의 TODO를 확인할 때 사용합니다.</p>
          </InfoBox>
          <h2 className="text-xl font-bold mb-3 mt-8">보호자 정보 등록</h2>
          <p className="text-muted-foreground mb-4">
            학생 등록 시 또는 학생 상세 페이지에서 보호자를 추가할 수 있습니다. 보호자의 이름, 관계, 연락처를 입력하면 결석 시 보호자에게 바로 연락할 수 있습니다.
          </p>
        </>
      )

    case 'bulk-import':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            다수의 학생을 한 번에 등록해야 할 때 엑셀 파일을 이용한 일괄 등록 기능을 사용할 수 있습니다.
          </p>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>학생 관리 페이지에서 <strong className="text-foreground">&quot;일괄 등록&quot;</strong> 버튼을 클릭합니다.</li>
            <li><strong className="text-foreground">&quot;양식 다운로드&quot;</strong>를 클릭하여 Excel 샘플 파일을 받습니다.</li>
            <li>양식에 맞춰 학생 정보를 입력합니다.</li>
            <li>파일을 업로드하면 미리보기가 표시됩니다.</li>
            <li>오류가 없으면 <strong className="text-foreground">&quot;등록&quot;</strong>을 클릭합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 엑셀 일괄 등록 — 파일 업로드 후 미리보기 화면]" />
          <InfoBox>
            <strong className="text-foreground">양식 주의사항</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>학생 이름은 필수 항목입니다.</li>
              <li>연락처는 하이픈(-) 없이 입력합니다.</li>
              <li>학년은 숫자로만 입력합니다 (예: 3).</li>
            </ul>
          </InfoBox>
        </>
      )

    case 'student-detail':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생 카드를 클릭하면 상세 페이지로 이동하여 해당 학생의 모든 정보를 한 곳에서 관리할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">탭 구성</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">탭</th>
                  <th className="text-left py-2 font-semibold">내용</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">기본 정보</td><td className="py-2">이름, 학교, 학년, 연락처, 보호자 정보</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">출석</td><td className="py-2">월별 출석 현황, 출석률 통계</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">성적</td><td className="py-2">과목별 성적 추이 그래프, 시험 목록</td></tr>
                <tr className="border-b"><td className="py-2 pr-4 font-medium text-foreground">TODO</td><td className="py-2">배정된 과제 목록, 완료/검증 현황</td></tr>
                <tr><td className="py-2 pr-4 font-medium text-foreground">상담</td><td className="py-2">상담 이력, 상담 메모</td></tr>
              </tbody>
            </table>
          </div>
          <Screenshot description="[스크린샷: 학생 상세 페이지 — 탭 레이아웃]" />
        </>
      )

    // ── 출석 관리 ──
    case 'daily-attendance':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            출석 관리 페이지에서 날짜와 수업을 선택한 뒤 학생별로 출석 상태를 설정합니다. 상태를 변경하면 자동으로 저장됩니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">출석 상태</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: '출석', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
              { label: '지각', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300' },
              { label: '조퇴', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
              { label: '결석', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-lg px-3 py-2 text-center text-sm font-medium', s.color)}>
                {s.label}
              </div>
            ))}
          </div>
          <h2 className="text-xl font-bold mb-3 mt-8">사용 방법</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>좌측 메뉴에서 <strong className="text-foreground">&quot;출석 관리&quot;</strong>를 클릭합니다.</li>
            <li>상단에서 날짜를 선택합니다.</li>
            <li>수업(반) 탭을 선택하면 해당 수업의 학생 목록이 표시됩니다.</li>
            <li>각 학생의 출석 상태 버튼을 탭하여 변경합니다.</li>
            <li>필요시 메모 아이콘을 눌러 메모를 추가합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 출석 관리 페이지 — 수업 탭과 학생 목록]" />
          <InfoBox>
            <strong className="text-foreground">과거 날짜 수정</strong>
            <p className="mt-1">날짜 선택기에서 과거 날짜를 선택하면 해당 날짜의 출석 기록을 수정할 수 있습니다. 변경 시 자동 저장됩니다.</p>
          </InfoBox>
        </>
      )

    case 'kiosk-mode':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            키오스크 모드는 태블릿을 출석 체크 전용 단말기로 활용하는 기능입니다. 학원 로비나 교실에 태블릿을 비치하면 편리합니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">키오스크 모드 진입</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>사이드바 하단의 <strong className="text-foreground">&quot;키오스크 모드&quot;</strong> 버튼을 클릭합니다.</li>
            <li>키오스크 설정 화면에서 학원과 수업을 선택합니다.</li>
            <li>전체 화면으로 출석 체크 화면이 표시됩니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 키오스크 모드 — 출석 체크 전체 화면]" />
          <h2 className="text-xl font-bold mb-3 mt-8">학생 TODO 확인</h2>
          <p className="text-muted-foreground mb-4">
            키오스크 화면 상단의 <strong className="text-foreground">&quot;학생 로그인&quot;</strong> 버튼을 누르면 학생이 본인의 학생 코드를 입력하여 배정된 과제(TODO)를 확인하고 완료 처리할 수 있습니다.
          </p>
          <Screenshot description="[스크린샷: 학생 로그인 → TODO 목록 화면]" />
          <InfoBox>
            <strong className="text-foreground">PWA 설치 추천</strong>
            <p className="mt-1">태블릿에 PWA로 설치하면 앱처럼 전체 화면으로 동작합니다. 설치 방법은 &quot;앱 설치&quot; 섹션을 참고하세요.</p>
          </InfoBox>
        </>
      )

    case 'contact-guardian':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            결석한 학생의 보호자에게 빠르게 연락할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">출석 화면에서 연락하기</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>출석 관리 페이지에서 결석으로 표시된 학생을 찾습니다.</li>
            <li>학생 이름 옆의 <strong className="text-foreground">전화 아이콘</strong>을 클릭합니다.</li>
            <li>등록된 보호자 연락처가 표시됩니다.</li>
            <li>전화번호를 탭하면 바로 전화를 걸 수 있습니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 출석 화면에서 보호자 연락처 팝업]" />
        </>
      )

    // ── 성적 관리 ──
    case 'create-exam':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            시험을 생성하고 학생별 성적을 입력하면 자동으로 백분율, 평균, 순위가 계산됩니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">시험 생성</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">&quot;성적 입력&quot;</strong> 메뉴를 클릭합니다.</li>
            <li><strong className="text-foreground">&quot;새 시험 추가&quot;</strong> 버튼을 클릭합니다.</li>
            <li>시험명, 날짜, 과목, 총점을 입력합니다.</li>
            <li>대상 수업(반)을 선택합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 새 시험 추가 폼]" />
          <h2 className="text-xl font-bold mb-3 mt-8">성적 입력</h2>
          <p className="text-muted-foreground mb-4">
            시험을 생성한 후, 학생 목록에서 각 학생의 점수를 입력합니다. <strong className="text-foreground">&quot;30/32&quot;</strong> 형식(득점/총점)으로도 입력할 수 있어 편리합니다.
          </p>
          <Screenshot description="[스크린샷: 학생별 성적 입력 화면]" />
        </>
      )

    case 'grade-trends':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생 상세 페이지의 <strong className="text-foreground">&quot;성적&quot;</strong> 탭에서 과목별, 시간별 성적 추이를 그래프로 확인할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">확인할 수 있는 정보</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>과목별 점수 추이 (선 그래프)</li>
            <li>시험별 백분율 및 등수</li>
            <li>전체 평균과의 비교</li>
          </ul>
          <Screenshot description="[스크린샷: 학생 상세 — 성적 추이 그래프]" />
        </>
      )

    // ── TODO 관리 ──
    case 'assign-todo':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생에게 자율학습 과제를 배정하고 진행 상황을 관리할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">과제 배정 방법</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li>좌측 메뉴에서 <strong className="text-foreground">&quot;TODO 관리&quot;</strong>를 클릭합니다.</li>
            <li><strong className="text-foreground">&quot;새 과제&quot;</strong> 버튼을 클릭합니다.</li>
            <li>과제 내용, 과목, 마감일을 입력합니다.</li>
            <li>배정할 학생을 선택합니다 (다중 선택 가능).</li>
            <li><strong className="text-foreground">&quot;저장&quot;</strong>을 클릭하면 선택한 학생 모두에게 배정됩니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 새 과제 배정 폼 — 학생 선택 화면]" />
          <InfoBox>
            <strong className="text-foreground">학생의 과제 확인</strong>
            <p className="mt-1">학생은 키오스크의 &quot;학생 로그인&quot; 기능으로 자신의 TODO를 확인하고, 완료 처리할 수 있습니다.</p>
          </InfoBox>
        </>
      )

    case 'verify-todo':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생이 완료한 과제를 강사가 확인하고 검증하는 과정입니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">검증 절차</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">TODO 관리 &gt; &quot;검증&quot;</strong> 탭을 클릭합니다.</li>
            <li>학생이 &quot;완료&quot;로 표시한 과제 목록이 나타납니다.</li>
            <li>실제로 완료한 과제를 선택합니다.</li>
            <li><strong className="text-foreground">&quot;검증 완료&quot;</strong> 버튼을 클릭합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: TODO 검증 탭 — 완료된 과제 목록]" />
          <p className="text-muted-foreground mb-4">
            여러 과제를 체크박스로 선택하여 <strong className="text-foreground">일괄 검증</strong>할 수도 있습니다.
          </p>
        </>
      )

    case 'todo-templates':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            자주 배정하는 과제를 템플릿으로 저장해두면 매번 입력할 필요 없이 빠르게 과제를 만들 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">템플릿 생성</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">TODO 관리 &gt; &quot;템플릿&quot;</strong> 탭을 클릭합니다.</li>
            <li><strong className="text-foreground">&quot;새 템플릿&quot;</strong> 버튼을 클릭합니다.</li>
            <li>템플릿 이름, 과제 항목들을 입력합니다.</li>
            <li>저장하면 과제 배정 시 템플릿을 선택할 수 있습니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 템플릿 관리 — 템플릿 생성/편집 화면]" />
        </>
      )

    // ── 리포트 · 상담 ──
    case 'monthly-report':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생의 출석, 성적, TODO 완료율 등을 종합한 월간 리포트를 생성할 수 있습니다. 보호자에게 공유하면 학습 상황을 한 눈에 전달할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">리포트 생성</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">&quot;리포트&quot;</strong> 메뉴를 클릭합니다.</li>
            <li>학생과 기간(월)을 선택합니다.</li>
            <li><strong className="text-foreground">&quot;리포트 생성&quot;</strong>을 클릭합니다.</li>
            <li>자동 생성된 내용을 확인하고, 필요시 강사 코멘트를 추가합니다.</li>
            <li>PDF로 다운로드하거나 보호자에게 공유합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 월간 리포트 미리보기]" />
        </>
      )

    case 'consultation':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학생 또는 보호자와의 상담 내용을 기록하고 관리할 수 있습니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">상담 기록 방법</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">&quot;상담 관리&quot;</strong> 메뉴를 클릭합니다.</li>
            <li><strong className="text-foreground">&quot;새 상담&quot;</strong> 버튼을 클릭합니다.</li>
            <li>학생, 상담 유형(학습/생활/진로/기타), 일시를 선택합니다.</li>
            <li>상담 내용을 작성하고 저장합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 새 상담 기록 폼]" />
          <p className="text-muted-foreground mb-4">
            학생 상세 페이지의 <strong className="text-foreground">&quot;상담&quot;</strong> 탭에서도 해당 학생의 상담 이력을 모아볼 수 있습니다.
          </p>
        </>
      )

    // ── 설정 ──
    case 'subjects':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            학원에서 가르치는 과목을 등록하고 관리합니다. 과목은 성적, TODO, 시간표 등에서 활용됩니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">과목 추가</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">설정 &gt; 과목 관리</strong>로 이동합니다.</li>
            <li><strong className="text-foreground">&quot;과목 추가&quot;</strong> 버튼을 클릭합니다.</li>
            <li>과목명과 색상을 입력합니다.</li>
            <li>저장하면 시스템 전체에서 사용할 수 있습니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 과목 관리 — 과목 목록 및 색상 설정]" />
        </>
      )

    case 'classes':
      return (
        <>
          <p className="text-muted-foreground leading-relaxed mb-6">
            수업(반)을 만들고 시간표를 설정합니다. 학생은 수업 단위로 배정되며, 출석도 수업별로 관리됩니다.
          </p>
          <h2 className="text-xl font-bold mb-3 mt-8">수업 생성</h2>
          <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong className="text-foreground">설정 &gt; 수업 관리</strong>로 이동합니다.</li>
            <li><strong className="text-foreground">&quot;수업 추가&quot;</strong> 버튼을 클릭합니다.</li>
            <li>수업명, 과목, 요일, 시간을 설정합니다.</li>
            <li>담당 강사를 지정합니다.</li>
            <li>저장 후 학생 관리에서 학생을 해당 수업에 배정합니다.</li>
          </ol>
          <Screenshot description="[스크린샷: 수업 관리 — 수업 생성 폼]" />
        </>
      )

    // ── PWA ──
    case 'pwa-install':
      return <PwaInstallGuide embedded />

    default:
      return <p className="text-muted-foreground">콘텐츠를 준비 중입니다.</p>
  }
}

// ─── Main component ───

export function GuideClient() {
  const [activeArticle, setActiveArticle] = useState('account-setup')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 현재 active article 정보
  const currentInfo = allArticles[getArticleIndex(activeArticle)] ?? allArticles[0]
  const currentIndex = getArticleIndex(activeArticle)
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null

  // 검색 필터
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.toLowerCase()
    return sections
      .map((s) => ({
        ...s,
        articles: s.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.articles.length > 0)
  }, [searchQuery])

  const handleSelect = (articleId: string) => {
    setActiveArticle(articleId)
    setIsMobileMenuOpen(false)
    // 스크롤 맨 위로
    document.getElementById('guide-content')?.scrollTo(0, 0)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">사용 가이드</h1>
        <p className="text-muted-foreground">Acadesk의 주요 기능 사용법을 안내합니다</p>
      </div>
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
      {/* ── Sidebar ── */}
      <div className="w-full lg:w-60 shrink-0 lg:sticky lg:top-0 self-start">
        <div className="flex items-center justify-between mb-4 lg:mb-5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> 가이드
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden gap-1.5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? '닫기' : '목차'}
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div
          className={cn(
            'space-y-5',
            isMobileMenuOpen ? 'block' : 'hidden',
            'lg:block',
            'bg-card lg:bg-transparent p-4 lg:p-0 rounded-xl border lg:border-0 shadow-lg lg:shadow-none mb-4 lg:mb-0'
          )}
        >
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색하기..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* 섹션 목록 */}
          <div className="space-y-5 max-h-[60vh] lg:max-h-none overflow-y-auto">
            {filteredSections.map((section) => {
              const Icon = section.icon
              return (
                <div key={section.id}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {section.title}
                  </h3>
                  <ul className="space-y-0.5">
                    {section.articles.map((article) => (
                      <li key={article.id}>
                        <button
                          onClick={() => handleSelect(article.id)}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors',
                            activeArticle === article.id
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          {article.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {filteredSections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div id="guide-content" className="flex-1 min-w-0 max-w-3xl">
        {/* 브레드크럼 */}
        <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2 flex-wrap">
          <span>가이드</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{currentInfo.sectionTitle}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{currentInfo.title}</span>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl md:text-3xl font-extrabold mb-6 leading-tight">
          {currentInfo.title}
        </h1>

        {/* 본문 */}
        <div className="prose-sm max-w-none space-y-4">
          <ArticleContent articleId={activeArticle} />
        </div>

        {/* 이전/다음 */}
        <div className="mt-12 pt-6 border-t flex justify-between items-center">
          {prevArticle ? (
            <button
              onClick={() => handleSelect(prevArticle.id)}
              className="text-sm hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              {prevArticle.title}
            </button>
          ) : <div />}
          {nextArticle ? (
            <button
              onClick={() => handleSelect(nextArticle.id)}
              className="text-sm hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              {nextArticle.title}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
    </div>
  )
}
