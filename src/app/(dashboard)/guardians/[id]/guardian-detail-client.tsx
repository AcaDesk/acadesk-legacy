'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Edit, Phone, Mail, Users as UsersIcon, UserCircle, Briefcase, MapPin } from 'lucide-react'
import { RoleGuard } from '@/components/auth/role-guard'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { formatPhoneNumber } from '@/lib/utils'

interface GuardianDetail {
  id: string
  relationship: string | null
  occupation: string | null
  address: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  student_guardians: Array<{
    is_primary: boolean
    students: {
      id: string
      student_code: string
      grade: string | null
      users: {
        name: string
      } | null
    } | null
  }>
}

interface GuardianDetailClientProps {
  guardian: GuardianDetail
}

export function GuardianDetailClient({ guardian }: GuardianDetailClientProps) {
  const router = useRouter()

  return (
    <PageErrorBoundary pageName="보호자 상세">
      <PageWrapper
        title={guardian.users?.name || '이름 없음'}
        subtitle={`${guardian.relationship ? `${guardian.relationship} · ` : ''}보호자`}
        actions={
          <RoleGuard allowedRoles={['owner', 'instructor']}>
            <Button onClick={() => router.push(`/guardians/${guardian.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Button>
          </RoleGuard>
        }
      >
        <div className="space-y-6">

        {/* Basic Info Cards */}
        <SectionErrorBoundary sectionName="기본 정보">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">연락처 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guardian.users?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{formatPhoneNumber(guardian.users.phone)}</span>
                    </div>
                  )}
                  {guardian.users?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.users.email}</span>
                    </div>
                  )}
                  {!guardian.users?.phone && !guardian.users?.email && (
                    <p className="text-sm text-muted-foreground">연락처 정보 없음</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">관계 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  {guardian.relationship ? (
                    <Badge variant="outline">{guardian.relationship}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">관계 정보 없음</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">추가 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {guardian.occupation && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.occupation}</span>
                    </div>
                  )}
                  {guardian.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{guardian.address}</span>
                    </div>
                  )}
                  {!guardian.occupation && !guardian.address && (
                    <p className="text-sm text-muted-foreground">추가 정보 없음</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SectionErrorBoundary>

        {/* Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">연결된 학생</TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <SectionErrorBoundary sectionName="연결된 학생">
              <Card>
                <CardHeader>
                  <CardTitle>연결된 학생 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  {guardian.student_guardians && guardian.student_guardians.length > 0 ? (
                    <div className="space-y-3">
                      {guardian.student_guardians.map((sg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between border-b pb-3 last:border-0"
                        >
                          <div className="flex items-center gap-4">
                            <UsersIcon className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium">
                                  {sg.students?.users?.name || '이름 없음'}
                                </div>
                                {sg.is_primary && (
                                  <Badge variant="default" className="text-xs">
                                    주 보호자
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sg.students?.student_code || '학번 없음'}
                                {sg.students?.grade && ` · ${sg.students.grade}`}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              sg.students?.id && router.push(`/students/${sg.students.id}`)
                            }
                          >
                            학생 상세
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">연결된 학생이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
    </PageErrorBoundary>
  )
}
