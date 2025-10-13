'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  Plus,
  Search,
  Users,
  UserCheck,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

export default function StaffPage() {
  // 피처 플래그 체크
  const featureStatus = FEATURES.staffManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="직원 관리" description="강사 및 관리자 정보를 체계적으로 관리하고, 역할별 권한을 효과적으로 제어하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="직원 관리" reason="직원 관리 시스템 업데이트가 진행 중입니다." />;
  }
  const [searchTerm, setSearchTerm] = useState('')

  const stats = {
    totalStaff: 8,
    activeTeachers: 5,
    adminStaff: 3,
  }

  const staffMembers = [
    {
      id: '1',
      name: '김영수',
      role: 'admin',
      email: 'kim@acadesk.com',
      phone: '010-1234-5678',
      subjects: ['운영'],
      status: 'active',
      joinedAt: '2023-03-01',
    },
    {
      id: '2',
      name: '이선생',
      role: 'teacher',
      email: 'lee@acadesk.com',
      phone: '010-2345-6789',
      subjects: ['수학', '과학'],
      status: 'active',
      joinedAt: '2023-05-15',
    },
    {
      id: '3',
      name: '박강사',
      role: 'teacher',
      email: 'park@acadesk.com',
      phone: '010-3456-7890',
      subjects: ['영어'],
      status: 'active',
      joinedAt: '2024-01-10',
    },
  ]

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>직원 관리</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                강사 및 관리자 정보 관리
              </p>
            </div>
            <Link href="/staff/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 직원 추가
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className={GRID_LAYOUTS.STATS}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                전체 직원
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStaff}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 전체 직원
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                강사
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeTeachers}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                활동 중인 강사
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                관리자
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.adminStaff}명</div>
              <p className="text-xs text-muted-foreground mt-1">
                관리자 및 운영진
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일, 담당 과목으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Staff List */}
        <motion.div
          className={GRID_LAYOUTS.LIST}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>직원 정보가 없습니다.</p>
                  <p className="text-sm mt-2">새 직원을 추가하여 시작하세요.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredStaff.map((staff, index) => (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Card className={CARD_STYLES.INTERACTIVE}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{staff.name}</h3>
                            <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                              {staff.role === 'admin' ? '관리자' : '강사'}
                            </Badge>
                            <Badge variant="outline">
                              {staff.status === 'active' ? '활동중' : '휴직'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{staff.phone}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {staff.subjects.map((subject) => (
                              <Badge key={subject} variant="outline">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/staff/${staff.id}`}>
                          <Button variant="outline" size="sm">
                            상세보기
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </PageWrapper>
  )
}
