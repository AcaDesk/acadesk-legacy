import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { MessageTemplatesClient } from './message-templates-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '알림 템플릿 관리',
  description: '자주 사용하는 알림톡/SMS 템플릿을 관리합니다.',
}

export default async function MessageTemplatesPage() {
  // Verify authentication
  await requireAuth()

  // TODO: Fetch templates from database
  const templates = [
    {
      id: '1',
      name: '결석 알림',
      category: 'attendance',
      channel: 'alimtalk',
      content: '안녕하세요, Acadesk입니다.\n\n{학생이름} 학생이 {날짜} {시간} 수업에 결석하셨습니다.\n\n결석 사유를 알려주시면 감사하겠습니다.',
      variables: ['학생이름', '날짜', '시간'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: '지각 알림',
      category: 'attendance',
      channel: 'alimtalk',
      content: '안녕하세요, Acadesk입니다.\n\n{학생이름} 학생이 {시간} 수업에 {지각시간}분 지각하셨습니다.',
      variables: ['학생이름', '시간', '지각시간'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: '학원비 미납 안내',
      category: 'payment',
      channel: 'alimtalk',
      content: '안녕하세요, Acadesk입니다.\n\n{학생이름} 학생의 {월}월 학원비 {금액}원이 미납되었습니다.\n\n확인 부탁드립니다.',
      variables: ['학생이름', '월', '금액'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: '리포트 발송',
      category: 'report',
      channel: 'alimtalk',
      content: '안녕하세요, Acadesk입니다.\n\n{학생이름} 학생의 {기간} 학습 리포트가 발송되었습니다.\n\n앱에서 확인해주세요.',
      variables: ['학생이름', '기간'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: '상담 일정 안내',
      category: 'consultation',
      channel: 'alimtalk',
      content: '안녕하세요, Acadesk입니다.\n\n{학생이름} 학생의 상담이 {날짜} {시간}에 예정되어 있습니다.\n\n참석 부탁드립니다.',
      variables: ['학생이름', '날짜', '시간'],
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ]

  return (
    <PageWrapper>
      <MessageTemplatesClient templates={templates} />
    </PageWrapper>
  )
}
