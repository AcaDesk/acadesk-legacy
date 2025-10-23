'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Skeleton } from '@ui/skeleton'
import { BookOpen } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getRecentClassSessions } from '@/app/actions/classes'

interface ClassSession {
  id: string
  session_date: string
  topic: string
  content: string | null
  homework_assigned: string | null
  class_id: string
}

interface ClassProgressCardProps {
  studentId: string
  classId: string
  className: string
}

export function ClassProgressCard({
  studentId: _studentId,
  classId,
  className,
}: ClassProgressCardProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClassSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId])

  async function loadClassSessions() {
    try {
      setLoading(true)
      const result = await getRecentClassSessions(classId, 5)
      
      if (result.success && result.data) {
        setSessions(result.data)
      }
    } catch (error) {
      console.error('Error loading class sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {className} 진도 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sessions.length === 0) {
    return null // Don't show card if no sessions
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          {className} 진도 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div
              key={session.id}
              className="p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{session.topic}</p>
                    {idx === 0 && (
                      <Badge variant="default" className="text-xs h-5">
                        최근
                      </Badge>
                    )}
                  </div>
                  {session.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {session.content}
                    </p>
                  )}
                  {session.homework_assigned && (
                    <div className="flex items-center gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">
                        과제
                      </Badge>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {session.homework_assigned}
                      </p>
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDate(new Date(session.session_date), 'M/d', {
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
