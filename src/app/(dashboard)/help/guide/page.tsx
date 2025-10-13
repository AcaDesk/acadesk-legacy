'use client'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BookOpen, Users, Calendar, FileText, ClipboardCheck, Settings, BarChart3, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState('')

  const guideCategories = [
    {
      icon: Users,
      title: '학생 관리',
      color: 'text-blue-600',
      items: [
        {
          question: '새 학생을 등록하는 방법',
          answer: '1. 좌측 메뉴에서 "학생 관리"를 클릭합니다.\n2. 우측 상단의 "학생 추가" 버튼을 클릭합니다.\n3. 학생의 기본 정보(이름, 연락처, 학년, 학교 등)를 입력합니다.\n4. "저장" 버튼을 클릭하면 자동으로 학생 코드가 생성됩니다.\n5. 필요시 보호자 정보도 함께 등록할 수 있습니다.'
        },
        {
          question: '학생 정보를 수정하는 방법',
          answer: '1. 학생 관리 페이지에서 수정하려는 학생을 찾습니다.\n2. 학생 카드를 클릭하여 상세 페이지로 이동합니다.\n3. "정보 수정" 버튼을 클릭합니다.\n4. 필요한 정보를 수정한 후 "저장" 버튼을 클릭합니다.'
        },
        {
          question: '학생 검색 및 필터링',
          answer: '학생 관리 페이지 상단의 검색바를 사용하여 이름, 학생코드, 학교, 학년 등으로 검색할 수 있습니다. 필터 버튼을 통해 특정 조건으로 학생 목록을 필터링할 수도 있습니다.'
        }
      ]
    },
    {
      icon: Calendar,
      title: '출석 관리',
      color: 'text-green-600',
      items: [
        {
          question: '출석 체크하는 방법',
          answer: '1. 좌측 메뉴에서 "출석 관리"를 클릭합니다.\n2. 출석 체크하려는 날짜를 선택합니다.\n3. 학생 목록에서 출석 상태를 선택합니다 (출석/지각/결석/조퇴).\n4. 필요시 메모를 추가할 수 있습니다.\n5. 자동으로 저장되며, 설정에 따라 보호자에게 알림이 전송됩니다.'
        },
        {
          question: '과거 출석 기록 수정',
          answer: '날짜 선택기에서 수정하려는 날짜를 선택한 후, 해당 학생의 출석 상태를 다시 선택하면 자동으로 업데이트됩니다.'
        }
      ]
    },
    {
      icon: FileText,
      title: '성적 관리',
      color: 'text-purple-600',
      items: [
        {
          question: '시험 성적 입력하기',
          answer: '1. "성적 입력" 메뉴를 클릭합니다.\n2. "시험 관리" 탭에서 "새 시험 추가" 버튼을 클릭합니다.\n3. 시험 정보(시험명, 날짜, 과목 등)를 입력합니다.\n4. 학생별로 성적을 입력합니다 (30/32 형식 지원).\n5. 저장하면 자동으로 백분율과 통계가 계산됩니다.'
        },
        {
          question: '성적 그래프 보기',
          answer: '학생 상세 페이지의 "성적" 탭에서 해당 학생의 과목별, 시간별 성적 추이를 그래프로 확인할 수 있습니다.'
        }
      ]
    },
    {
      icon: ClipboardCheck,
      title: 'TODO 관리',
      color: 'text-orange-600',
      items: [
        {
          question: '학생에게 과제 배정하기',
          answer: '1. "TODO 관리" 메뉴를 클릭합니다.\n2. "새 과제 추가" 버튼을 클릭합니다.\n3. 과제 내용, 마감일, 과목을 입력합니다.\n4. 배정할 학생들을 선택합니다.\n5. "저장" 버튼을 클릭하면 선택한 모든 학생에게 과제가 배정됩니다.'
        },
        {
          question: '과제 검증하기',
          answer: '"TODO 관리 > 검증" 메뉴에서 학생들이 완료한 과제를 확인하고 검증할 수 있습니다. 여러 과제를 선택하여 일괄 검증도 가능합니다.'
        },
        {
          question: 'TODO 템플릿 사용하기',
          answer: '자주 배정하는 과제는 템플릿으로 저장하여 재사용할 수 있습니다. "템플릿 관리"에서 템플릿을 생성하고, 과제 추가 시 템플릿을 선택하면 빠르게 배정할 수 있습니다.'
        }
      ]
    },
    {
      icon: BarChart3,
      title: '리포트',
      color: 'text-red-600',
      items: [
        {
          question: '월간 리포트 생성하기',
          answer: '1. "월간 리포트" 메뉴를 클릭합니다.\n2. 리포트를 생성할 학생과 기간을 선택합니다.\n3. "리포트 생성" 버튼을 클릭합니다.\n4. 자동으로 출석, 성적, TODO 완료율 등이 포함된 리포트가 생성됩니다.\n5. PDF로 다운로드하거나 보호자에게 직접 전송할 수 있습니다.'
        },
        {
          question: '리포트 내용 수정',
          answer: '생성된 리포트의 "편집" 버튼을 통해 교사의 코멘트나 특이사항을 추가할 수 있습니다.'
        }
      ]
    },
    {
      icon: Settings,
      title: '설정',
      color: 'text-gray-600',
      items: [
        {
          question: '과목 추가 및 관리',
          answer: '"설정 > 과목 관리"에서 학원에서 사용하는 과목들을 등록하고 관리할 수 있습니다. 각 과목마다 색상을 지정하여 시각적으로 구분할 수 있습니다.'
        },
        {
          question: '알림 설정',
          answer: '"설정 > 알림 설정"에서 학생 출결, 과제 완료, 상담 예약 등 각종 이벤트에 대한 알림 설정을 변경할 수 있습니다.'
        }
      ]
    }
  ]

  const filteredCategories = guideCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0)

  return (
    <PageWrapper
      title="사용 가이드"
      subtitle="Acadesk의 주요 기능 사용법을 안내합니다"
      icon={<BookOpen className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* 검색 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="가이드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* 가이드 카테고리 */}
        {filteredCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              검색 결과가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${category.color}`} />
                    {category.title}
                  </CardTitle>
                  <CardDescription>
                    {category.title} 기능 사용 방법
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`item-${index}-${itemIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="text-sm text-muted-foreground whitespace-pre-line">
                            {item.answer}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          })
        )}

        {/* 추가 도움말 */}
        <Card>
          <CardHeader>
            <CardTitle>추가 도움이 필요하신가요?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              가이드에서 찾지 못한 내용이나 추가 문의사항이 있으시면 언제든지 문의해주세요.
            </p>
            <div className="flex gap-3">
              <a href="/help/faq" className="text-sm text-primary hover:underline">
                자주 묻는 질문 보기
              </a>
              <span className="text-muted-foreground">|</span>
              <a href="/help/inquiries" className="text-sm text-primary hover:underline">
                1:1 문의하기
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
