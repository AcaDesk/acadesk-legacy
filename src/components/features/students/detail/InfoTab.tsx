'use client'

import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  School,
  Users,
  FileText,
  Edit,
  Tag,
  Bus
} from 'lucide-react'
import { format as formatDate, differenceInYears } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useStudentDetail } from '@/contexts/studentDetailContext'
import { StudentBasicInfo } from './StudentBasicInfo'
import { StudentSiblingsCard } from './StudentSiblingsCard'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

export function InfoTab() {
  const router = useRouter()
  const { student } = useStudentDetail()

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    return differenceInYears(new Date(), new Date(birthDate))
  }

  const getGenderLabel = (gender: string | null) => {
    if (!gender) return null
    const labels: Record<string, string> = {
      male: '남성',
      female: '여성',
      other: '기타',
    }
    return labels[gender] || gender
  }

  const getStudentTypeLabel = (type: string | null) => {
    if (!type) return null
    const labels: Record<string, string> = {
      regular: '정규',
      transfer: '전입',
      temporary: '임시',
      trial: '체험',
    }
    return labels[type] || type
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Student Basic Info & Siblings */}
      <motion.div className="grid gap-6 lg:grid-cols-2" variants={itemVariants}>
        <StudentBasicInfo student={student} />
        <StudentSiblingsCard studentId={student.id} />
      </motion.div>

      {/* Detailed Information */}
      <motion.div className="grid gap-6 md:grid-cols-2" variants={itemVariants}>
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">개인 정보</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/students/${student.id}/edit`)}
                className="gap-2"
              >
                <Edit className="h-3 w-3" />
                수정
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">이름</p>
                  <p className="font-medium break-words">{student.users?.name || '정보 없음'}</p>
                </div>
              </div>

              {student.student_code && (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학생 코드</p>
                    <p className="font-medium font-mono break-all">{student.student_code}</p>
                  </div>
                </div>
              )}

              {student.birth_date ? (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">생년월일 / 나이</p>
                    <p className="font-medium break-words">
                      {formatDate(new Date(student.birth_date), 'yyyy년 MM월 dd일', { locale: ko })}
                      {calculateAge(student.birth_date) && (
                        <span className="ml-2 text-muted-foreground">
                          ({calculateAge(student.birth_date)}세)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">생년월일</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {student.gender ? (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">성별</p>
                    <p className="font-medium">{getGenderLabel(student.gender)}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">성별</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">연락처 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {student.student_phone ? (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학생 연락처</p>
                    <p className="font-medium break-all">{student.student_phone}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학생 연락처</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {student.users?.email ? (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="font-medium break-all">{student.users.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">이메일</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {student.emergency_contact ? (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">비상 연락처</p>
                    <p className="font-medium break-all">{student.emergency_contact}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">비상 연락처</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* School Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">학교 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {student.school ? (
                <div className="flex items-start gap-3">
                  <School className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학교</p>
                    <p className="font-medium break-words">{student.school}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <School className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학교</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {student.grade ? (
                <div className="flex items-start gap-3">
                  <School className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학년</p>
                    <p className="font-medium">{student.grade}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <School className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학년</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {(student as any).student_type ? (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학생 유형</p>
                    <Badge variant="outline">
                      {getStudentTypeLabel((student as any).student_type)}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">학생 유형</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">추가 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">등록일</p>
                  <p className="font-medium">
                    {formatDate(new Date(student.enrollment_date), 'yyyy년 MM월 dd일', { locale: ko })}
                    <span className="ml-2 text-sm text-muted-foreground">
                      (
                      {Math.floor(
                        (new Date().getTime() - new Date(student.enrollment_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                      일째)
                    </span>
                  </p>
                </div>
              </div>

              {(student as any).uses_shuttle_bus !== null ? (
                <div className="flex items-start gap-3">
                  <Bus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">셔틀버스 이용</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={(student as any).uses_shuttle_bus ? 'default' : 'outline'}>
                        {(student as any).uses_shuttle_bus ? '이용' : '미이용'}
                      </Badge>
                      {(student as any).uses_shuttle_bus && (student as any).shuttle_bus_location && (
                        <span className="text-sm text-muted-foreground break-words">
                          ({(student as any).shuttle_bus_location})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Bus className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">셔틀버스 이용</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}

              {student.notes ? (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">특이사항</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{student.notes}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">특이사항</p>
                    <p className="text-sm text-muted-foreground">정보 없음</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guardian Information */}
      {student.student_guardians && student.student_guardians.length > 0 ? (
        <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">보호자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {student.student_guardians.map((sg: any, index: number) => (
                <div key={index} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">{sg.guardians?.users?.name || '이름 없음'}</p>
                    {sg.guardians?.relationship && (
                      <Badge variant="outline" className="text-xs">
                        {sg.guardians.relationship}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {sg.guardians?.users?.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="break-all">{sg.guardians.users.phone}</span>
                      </div>
                    )}
                    {sg.guardians?.users?.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="break-all">{sg.guardians.users.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">보호자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-8">등록된 보호자가 없습니다</p>
          </CardContent>
        </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
