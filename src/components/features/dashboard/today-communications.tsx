"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
// import { Button } from "@ui/button"
import Link from "next/link"
import { Cake, MessageSquare, Users, Phone } from "lucide-react"
import type { BirthdayStudent, ScheduledConsultation, ParentToContact } from "@/hooks/use-dashboard-data"

interface TodayCommunicationsProps {
  birthdayStudents: BirthdayStudent[]
  scheduledConsultations: ScheduledConsultation[]
  parentsToContact?: ParentToContact[]
}

export function TodayCommunications({ birthdayStudents, scheduledConsultations, parentsToContact = [] }: TodayCommunicationsProps) {
  const hasAnyCommunications = birthdayStudents.length > 0 || scheduledConsultations.length > 0 || parentsToContact.length > 0

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          오늘의 소통
        </CardTitle>
        <CardDescription>학생과 학부모와의 소통이 필요한 일정입니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empty State */}
        {!hasAnyCommunications && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">오늘 예정된 소통 일정이 없습니다</p>
          </div>
        )}

        {/* Birthday Students */}
        {birthdayStudents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-600" />
              생일 학생
            </h4>
            <div className="space-y-2">
              {birthdayStudents.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center">
                        <Cake className="h-4 w-4 text-pink-600" />
                      </div>
                      <span className="font-medium">{student.name || '이름 없음'}</span>
                    </div>
                    <Badge variant="outline" className="bg-pink-50 dark:bg-pink-950 border-pink-200">
                      🎉 생일
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Consultations */}
        {scheduledConsultations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-info" />
              예정된 상담
            </h4>
            <div className="space-y-2">
              {scheduledConsultations.map((consultation) => (
                <Link key={consultation.id} href={`/consultations/${consultation.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-info" />
                      </div>
                      <div>
                        <div className="font-medium">{consultation.student_name || '이름 없음'}</div>
                        <div className="text-xs text-muted-foreground">
                          {consultation.scheduled_at}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">상담 예정</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Parents to Contact */}
        {parentsToContact.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-600" />
              연락 필요 학부모
            </h4>
            <div className="space-y-2">
              {parentsToContact.map((parent) => (
                <Link key={parent.id} href={`/guardians/${parent.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium">{parent.student_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {parent.reason}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(parent.priority)}>
                      {parent.priority === 'high' ? '긴급' : parent.priority === 'medium' ? '중요' : '일반'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
