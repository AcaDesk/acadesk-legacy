'use client'

import { PageWrapper } from '@/components/layout/page-wrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/accordion'
import { FileQuestion, Search, Tag } from 'lucide-react'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { useState } from 'react'
import { Button } from '@ui/button'

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const faqCategories = [
    { id: 'general', label: '일반', color: 'bg-blue-100 text-blue-600' },
    { id: 'account', label: '계정', color: 'bg-green-100 text-green-600' },
    { id: 'billing', label: '결제', color: 'bg-purple-100 text-purple-600' },
    { id: 'features', label: '기능', color: 'bg-orange-100 text-orange-600' },
    { id: 'technical', label: '기술', color: 'bg-red-100 text-red-600' },
  ]

  const faqs = [
    {
      category: 'general',
      question: 'Acadesk는 어떤 서비스인가요?',
      answer: 'Acadesk는 학원 운영을 위한 종합 관리 시스템입니다. 학생 관리, 출석 체크, 성적 관리, 과제 배정, 리포트 생성 등 학원 운영에 필요한 모든 기능을 제공합니다.'
    },
    {
      category: 'general',
      question: '무료로 사용할 수 있나요?',
      answer: '14일 무료 체험을 제공하고 있으며, 이후 학생 수에 따라 합리적인 가격의 요금제를 선택하실 수 있습니다. 자세한 요금 정보는 설정 > 결제 페이지에서 확인하실 수 있습니다.'
    },
    {
      category: 'general',
      question: '모바일에서도 사용할 수 있나요?',
      answer: '네, Acadesk는 반응형 디자인으로 제작되어 PC, 태블릿, 모바일 등 모든 기기에서 원활하게 사용하실 수 있습니다. 추후 전용 모바일 앱도 출시 예정입니다.'
    },
    {
      category: 'account',
      question: '비밀번호를 잊어버렸어요',
      answer: '로그인 페이지의 "비밀번호 찾기" 버튼을 클릭하여 가입하신 이메일로 비밀번호 재설정 링크를 받으실 수 있습니다. 이메일이 도착하지 않으면 스팸 메일함을 확인해주세요.'
    },
    {
      category: 'account',
      question: '이메일 주소를 변경하고 싶어요',
      answer: '설정 > 계정 설정 페이지에서 이메일 주소를 변경하실 수 있습니다. 새 이메일로 인증 링크가 발송되며, 링크를 클릭하여 인증을 완료해야 변경이 완료됩니다.'
    },
    {
      category: 'account',
      question: '여러 명이 하나의 계정을 사용할 수 있나요?',
      answer: '네, 직원 관리 기능을 통해 여러 명의 직원 계정을 추가할 수 있습니다. 각 직원은 고유한 계정으로 로그인하며, 권한 설정을 통해 접근 가능한 기능을 제한할 수 있습니다.'
    },
    {
      category: 'billing',
      question: '결제 수단은 어떤 것들이 있나요?',
      answer: '신용카드, 체크카드, 계좌이체를 지원합니다. 결제 정보는 안전하게 암호화되어 저장되며, 월 자동 결제 또는 연 단위 결제를 선택하실 수 있습니다.'
    },
    {
      category: 'billing',
      question: '중도 해지 시 환불이 가능한가요?',
      answer: '연 단위로 결제하신 경우, 사용하지 않은 기간에 대해 일할 계산하여 환불해드립니다. 월 단위 결제의 경우 다음 결제일 전까지 해지하시면 추가 요금이 발생하지 않습니다.'
    },
    {
      category: 'billing',
      question: '요금제를 변경할 수 있나요?',
      answer: '언제든지 요금제를 업그레이드하거나 다운그레이드할 수 있습니다. 업그레이드 시 즉시 적용되며, 다운그레이드는 다음 결제 주기부터 적용됩니다.'
    },
    {
      category: 'features',
      question: '학생 수에 제한이 있나요?',
      answer: '요금제에 따라 등록 가능한 학생 수가 다릅니다. 베이직 플랜은 최대 50명, 프로 플랜은 최대 120명, 엔터프라이즈 플랜은 무제한입니다.'
    },
    {
      category: 'features',
      question: '데이터를 백업할 수 있나요?',
      answer: '네, 설정 > 데이터 관리에서 언제든지 전체 데이터를 Excel 또는 CSV 형식으로 내보내기(백업)할 수 있습니다. 또한 시스템에서 자동으로 매일 백업을 수행하고 있습니다.'
    },
    {
      category: 'features',
      question: 'SMS나 카카오톡으로 알림을 보낼 수 있나요?',
      answer: '네, 출석 알림, 과제 알림, 리포트 발송 등을 SMS 또는 카카오톡으로 보호자에게 전송할 수 있습니다. 단, SMS와 카카오톡 발송은 별도 요금이 부과됩니다.'
    },
    {
      category: 'features',
      question: '리포트를 PDF로 저장할 수 있나요?',
      answer: '네, 생성된 리포트는 PDF로 다운로드하거나 이메일로 직접 발송할 수 있습니다. PDF에는 학생 정보, 출석 통계, 성적 그래프, 과제 완료율 등이 포함됩니다.'
    },
    {
      category: 'technical',
      question: '인터넷 연결이 끊겼을 때도 사용할 수 있나요?',
      answer: '현재는 인터넷 연결이 필요합니다. 추후 업데이트를 통해 오프라인 모드를 지원할 예정입니다.'
    },
    {
      category: 'technical',
      question: '데이터는 안전하게 보관되나요?',
      answer: '모든 데이터는 암호화되어 안전한 클라우드 서버에 저장됩니다. 정기적인 백업과 보안 점검을 실시하고 있으며, 개인정보는 별도 암호화 처리되어 관리됩니다.'
    },
    {
      category: 'technical',
      question: '시스템 속도가 느려요',
      answer: '브라우저 캐시를 삭제하거나 다른 브라우저를 사용해보세요. 문제가 지속되면 고객 지원팀(support@acadesk.com)으로 문의해주시면 신속히 해결해드리겠습니다.'
    },
    {
      category: 'technical',
      question: '어떤 브라우저를 지원하나요?',
      answer: 'Chrome, Safari, Firefox, Edge 등 최신 버전의 모든 주요 브라우저를 지원합니다. 최상의 경험을 위해 항상 최신 버전의 브라우저를 사용하시는 것을 권장합니다.'
    },
  ]

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <PageWrapper
      title="자주 묻는 질문 (FAQ)"
      subtitle="자주 묻는 질문과 답변을 확인하세요"
      icon={<FileQuestion className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* 검색 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="질문 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 카테고리 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                전체
              </Button>
              {faqCategories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCategory === 'all'
                ? '전체 질문'
                : faqCategories.find(c => c.id === selectedCategory)?.label + ' 질문'}
            </CardTitle>
            <CardDescription>
              총 {filteredFaqs.length}개의 질문
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFaqs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, index) => {
                  const categoryInfo = faqCategories.find(c => c.id === faq.category)
                  return (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={categoryInfo?.color}>
                            {categoryInfo?.label}
                          </Badge>
                          <span>{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-20 text-sm text-muted-foreground">
                          {faq.answer}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* 추가 도움말 */}
        <Card>
          <CardHeader>
            <CardTitle>원하는 답변을 찾지 못하셨나요?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              FAQ에서 답변을 찾지 못하셨다면 아래 방법으로 문의해주세요.
            </p>
            <div className="flex gap-3">
              <a href="/help/guide" className="text-sm text-primary hover:underline">
                사용 가이드 보기
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
