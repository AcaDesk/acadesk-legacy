'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import {
  GraduationCap,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Users,
  Bus,
  Tag,
} from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { getGuardianRelationshipLabel, getGuardianDisplayName } from '@/lib/constants'
import type { StudentDetail } from '@/core/types/studentDetail.types'

// Extended student type with optional fields
interface ExtendedStudentDetail extends StudentDetail {
  student_type?: string | null
  student_region?: string | null
  uses_shuttle_bus?: boolean | null
  shuttle_bus_location?: string | null
}

interface StudentBasicInfoProps {
  student: StudentDetail
}

export function StudentBasicInfo({ student: baseStudent }: StudentBasicInfoProps) {
  const student = baseStudent as ExtendedStudentDetail
  const getCommuteMethodLabel = (method: string | null) => {
    if (!method) return null
    const labels: Record<string, string> = {
      shuttle: '셔틀버스',
      walk: '도보',
      private: '자가',
      public: '대중교통',
      other: '기타',
    }
    return labels[method] || method
  }

  const getMarketingSourceLabel = (source: string | null) => {
    if (!source) return null
    const labels: Record<string, string> = {
      referral: '지인 소개',
      blog: '블로그',
      sign: '간판',
      online_ad: '온라인 광고',
      social_media: 'SNS',
      other: '기타',
    }
    return labels[source] || source
  }

  const getStudentTypeLabel = (type: string | null) => {
    if (!type) return null
    const labels: Record<string, string> = {
      elementary: '초등부',
      middle: '중등부',
      high: '고등부',
      prep_high1: '예비 고1',
      prep_middle1: '예비 중1',
      repeat: '재수생',
      adult: '성인',
    }
    return labels[type] || type
  }

  const getRegionLabel = (region: string | null) => {
    if (!region) return null
    const labels: Record<string, string> = {
      haeundae: '해운대구',
      suyeong: '수영구',
      nam: '남구',
      busanjin: '부산진구',
      dong: '동구',
      seo: '서구',
      jung: '중구',
      yeongdo: '영도구',
      buk: '북구',
      sasang: '사상구',
      geumjeong: '금정구',
      gangseo: '강서구',
      yeonje: '연제구',
      saha: '사하구',
      gijang: '기장군',
      other: '기타',
    }
    return labels[region] || region
  }

  return (
    <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {/* Column 1: 학교 및 학생 정보 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-medium">학교 정보</span>
                </div>
                <div className="pl-6 space-y-1">
                  {student.school && (
                    <p className="text-xs font-medium">{student.school}</p>
                  )}
                  {student.grade && (
                    <p className="text-xs text-muted-foreground">
                      {student.grade}
                    </p>
                  )}
                  {!student.school && !student.grade && (
                    <p className="text-xs text-muted-foreground">-</p>
                  )}
                </div>
              </div>

              {student.student_type && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">학생 유형</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-xs">
                      {getStudentTypeLabel(student.student_type)}
                    </p>
                  </div>
                </div>
              )}

              {student.student_region && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">거주 지역</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-xs">
                      {getRegionLabel(student.student_region)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Column 2: 연락처 정보 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">연락처</span>
                </div>
                <div className="pl-6 space-y-1">
                  {student.student_phone && (
                    <p className="text-xs font-medium">
                      학생: {student.student_phone}
                    </p>
                  )}
                  {student.users?.phone && (
                    <p className="text-xs">전화: {student.users.phone}</p>
                  )}
                  {student.users?.email && (
                    <p className="text-xs truncate">
                      이메일: {student.users.email}
                    </p>
                  )}
                  {student.emergency_contact && (
                    <p className="text-xs font-medium text-destructive">
                      긴급: {student.emergency_contact}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: 입회 정보 및 기타 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">입회일</span>
                </div>
                <div className="pl-6">
                  <p className="font-medium">
                    {formatDate(new Date(student.enrollment_date), 'yyyy.MM.dd')}
                  </p>
                </div>
              </div>

              {(student.commute_method || student.uses_shuttle_bus) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bus className="h-4 w-4" />
                    <span className="font-medium">통학 정보</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {student.commute_method && (
                      <p className="text-xs">
                        {getCommuteMethodLabel(student.commute_method)}
                      </p>
                    )}
                    {student.uses_shuttle_bus && (
                      <>
                        <p className="text-xs font-medium">셔틀버스 이용</p>
                        {student.shuttle_bus_location && (
                          <p className="text-xs text-muted-foreground">
                            탑승지: {student.shuttle_bus_location}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {student.marketing_source && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-medium">유입 경로</span>
                  </div>
                  <div className="pl-6">
                    <p className="text-xs">
                      {getMarketingSourceLabel(student.marketing_source)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 보호자 정보 - 전체 너비로 하단에 표시 */}
          {student.student_guardians && student.student_guardians.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Users className="h-4 w-4" />
                <span className="font-medium">보호자</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {student.student_guardians.map((sg, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {getGuardianDisplayName(
                          student.users?.name,
                          sg.guardians?.relationship,
                          sg.guardians?.users?.name
                        )}
                      </p>
                      {sg.guardians?.users?.phone && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {sg.guardians.users.phone}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  )
}
