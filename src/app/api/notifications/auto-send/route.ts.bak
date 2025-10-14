import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auto-notification API endpoint
 * Triggered by cron job or scheduler
 * Handles:
 * 1. Absent student alerts (30 min after class start)
 * 2. TODO deadline reminders (day before due date)
 * 3. Book return reminders (Monday mornings)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { type } = await request.json()

    switch (type) {
      case 'absent_students':
        return await handleAbsentStudents(supabase)
      case 'todo_reminders':
        return await handleTodoReminders(supabase)
      case 'book_return_reminders':
        return await handleBookReturnReminders(supabase)
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Auto-notification error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Send alerts for students absent 30 minutes after class start
 */
async function handleAbsentStudents(supabase: any) {
  const now = new Date()
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const today = now.toISOString().split('T')[0]

  // Find sessions that started 30 minutes ago
  const { data: sessions, error: sessionsError } = await supabase
    .from('attendance_sessions')
    .select(`
      id,
      class_id,
      session_date,
      start_time,
      classes (
        id,
        name
      )
    `)
    .eq('session_date', today)
    .eq('status', 'in_progress')
    .lte('start_time', thirtyMinutesAgo.toTimeString().slice(0, 5))

  if (sessionsError) throw sessionsError
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ message: 'No sessions requiring alerts', count: 0 })
  }

  let alertCount = 0

  for (const session of sessions) {
    // Get absent students for this session
    const { data: absentRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select(`
        student_id,
        students (
          id,
          student_code,
          users (
            id,
            name,
            phone
          )
        )
      `)
      .eq('session_id', session.id)
      .eq('status', 'absent')
      .is('notification_sent_at', null)

    if (recordsError) continue

    for (const record of absentRecords || []) {
      const student = record.students
      if (!student?.users?.phone) continue

      // Create notification log
      const { error: logError } = await supabase.from('notification_logs').insert({
        student_id: student.id,
        notification_type: 'sms',
        status: 'sent',
        message: `${student.users.name} 학생이 ${session.classes?.name} 수업에 결석했습니다. (${session.session_date} ${session.start_time})`,
        sent_at: new Date().toISOString(),
      })

      if (logError) continue

      // Update attendance record
      await supabase
        .from('attendance_records')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('session_id', session.id)
        .eq('student_id', student.id)

      alertCount++
    }
  }

  return NextResponse.json({
    message: 'Absent student alerts sent',
    count: alertCount,
    sessions: sessions.length
  })
}

/**
 * Send reminders for TODOs due tomorrow
 */
async function handleTodoReminders(supabase: any) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().split('T')[0]

  // Find incomplete TODOs due tomorrow that haven't been reminded
  const { data: todos, error: todosError } = await supabase
    .from('student_todos')
    .select(`
      id,
      student_id,
      title,
      due_date,
      students (
        id,
        student_code,
        users (
          id,
          name,
          phone
        )
      )
    `)
    .eq('due_date', tomorrowDate)
    .eq('status', 'pending')
    .is('reminder_sent_at', null)

  if (todosError) throw todosError
  if (!todos || todos.length === 0) {
    return NextResponse.json({ message: 'No TODOs requiring reminders', count: 0 })
  }

  let reminderCount = 0

  for (const todo of todos) {
    const student = todo.students
    if (!student?.users?.phone) continue

    // Create notification log
    const { error: logError } = await supabase.from('notification_logs').insert({
      student_id: student.id,
      notification_type: 'sms',
      status: 'sent',
      message: `[과제 알림] "${todo.title}" 과제가 내일(${todo.due_date}) 마감됩니다.`,
      sent_at: new Date().toISOString(),
    })

    if (logError) continue

    // Update TODO
    await supabase
      .from('student_todos')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', todo.id)

    reminderCount++
  }

  return NextResponse.json({
    message: 'TODO reminders sent',
    count: reminderCount
  })
}

/**
 * Send book return reminders (Monday mornings for books due this week)
 */
async function handleBookReturnReminders(supabase: any) {
  const now = new Date()

  // Only run on Mondays
  if (now.getDay() !== 1) {
    return NextResponse.json({ message: 'Not Monday, skipping book reminders', count: 0 })
  }

  const today = now.toISOString().split('T')[0]
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nextWeekDate = nextWeek.toISOString().split('T')[0]

  // Find unreturned books due this week
  const { data: lendings, error: lendingsError } = await supabase
    .from('book_lendings')
    .select(`
      id,
      student_id,
      due_date,
      books (
        id,
        title,
        author
      ),
      students (
        id,
        student_code,
        users (
          id,
          name,
          phone
        )
      )
    `)
    .is('returned_at', null)
    .gte('due_date', today)
    .lte('due_date', nextWeekDate)
    .is('reminder_sent_at', null)

  if (lendingsError) throw lendingsError
  if (!lendings || lendings.length === 0) {
    return NextResponse.json({ message: 'No book returns requiring reminders', count: 0 })
  }

  let reminderCount = 0

  for (const lending of lendings) {
    const student = lending.students
    if (!student?.users?.phone) continue

    // Create notification log
    const { error: logError } = await supabase.from('notification_logs').insert({
      student_id: student.id,
      notification_type: 'sms',
      status: 'sent',
      message: `[도서 반납 안내] "${lending.books?.title}" 도서가 ${lending.due_date}까지 반납 예정입니다.`,
      sent_at: new Date().toISOString(),
    })

    if (logError) continue

    // Update lending
    await supabase
      .from('book_lendings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', lending.id)

    reminderCount++
  }

  return NextResponse.json({
    message: 'Book return reminders sent',
    count: reminderCount
  })
}
