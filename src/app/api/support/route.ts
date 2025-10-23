/**
 * Support API
 * 피드백, 문의, 버그 리포트를 처리하는 통합 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export interface SupportTicketRequest {
  ticket_type: 'feedback' | 'inquiry' | 'bug_report'
  category?: string
  subject: string
  message: string
  // Bug report specific fields
  severity?: string
  page?: string
  steps_to_reproduce?: string
  browser?: string
  // Additional metadata
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 현재 사용자 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      )
    }

    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, email, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 요청 본문 파싱
    const body: SupportTicketRequest = await request.json()

    // 필수 필드 검증
    if (!body.ticket_type || !body.subject || !body.message) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 티켓 타입 검증
    if (!['feedback', 'inquiry', 'bug_report'].includes(body.ticket_type)) {
      return NextResponse.json(
        { error: '유효하지 않은 티켓 타입입니다.' },
        { status: 400 }
      )
    }

    // 우선순위 결정 (버그 리포트의 severity 기반)
    let priority = 'normal'
    if (body.ticket_type === 'bug_report' && body.severity) {
      if (body.severity === 'critical' || body.severity === 'urgent') {
        priority = 'urgent'
      } else if (body.severity === 'major') {
        priority = 'high'
      }
    }

    // Support ticket 생성
    const { data: ticket, error: insertError } = await supabase
      .from('support_tickets')
      .insert({
        tenant_id: userData.tenant_id,
        user_id: user.id,
        user_email: userData.email,
        user_name: userData.name,
        ticket_type: body.ticket_type,
        status: 'open',
        priority,
        category: body.category || null,
        subject: body.subject,
        message: body.message,
        severity: body.severity || null,
        page: body.page || null,
        steps_to_reproduce: body.steps_to_reproduce || null,
        browser: body.browser || null,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('Support ticket creation error:', insertError)
      return NextResponse.json(
        { error: '티켓 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        ticket_id: ticket.id,
        message: '성공적으로 접수되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Support API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
