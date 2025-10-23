'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Skeleton } from '@ui/skeleton'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { motion, AnimatePresence } from 'motion/react'
import { getStudentActivityLogs } from '@/app/actions/students'
import {
  GraduationCap,
  CheckCircle,
  BookOpen,
  Award,
  Clock,
  XCircle,
  MessageCircle,
  FileText,
  Send,
  Book,
  AlertCircle,
  Package,
  CreditCard,
  Receipt,
  ArrowLeftCircle,
  UserPlus,
  UserMinus,
  Edit,
  StickyNote,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ActivityLog {
  id: string
  activity_type: string
  activity_date: string
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  ref_activity_types: {
    label: string
    icon: string | null
    color: string | null
  } | null
}

interface ActivityTimelineProps {
  studentId: string
  limit?: number
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  CheckCircle,
  BookOpen,
  Award,
  Clock,
  XCircle,
  MessageCircle,
  FileText,
  Send,
  Book,
  AlertCircle,
  Package,
  CreditCard,
  Receipt,
  ArrowLeftCircle,
  UserPlus,
  UserMinus,
  Edit,
  StickyNote,
  Info,
  Calendar,
}

const colorMap: Record<string, string> = {
  default: 'bg-foreground text-background',
  secondary: 'bg-muted text-foreground',
  outline: 'bg-background border-2 border-border text-foreground',
  destructive: 'bg-muted text-foreground',
}

export function ActivityTimeline({ studentId, limit = 50 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function loadActivities() {
    try {
      setLoading(true)
      const result = await getStudentActivityLogs(studentId, limit)
      
      if (result.success && result.data) {
        setActivities(result.data)
      }
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayActivities = showAll ? activities : activities.slice(0, 10)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>활동 타임라인</CardTitle>
          <CardDescription>학생의 모든 활동 이력</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>활동 타임라인</CardTitle>
          <CardDescription>학생의 모든 활동 이력</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>아직 기록된 활동이 없습니다</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>활동 타임라인</CardTitle>
            <CardDescription>학생의 모든 활동 이력 ({activities.length}개)</CardDescription>
          </div>
          {activities.length > 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  간략히 보기
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  전체 보기 ({activities.length - 10}개 더)
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {displayActivities.map((activity, idx) => {
              const Icon = activity.ref_activity_types?.icon
                ? iconMap[activity.ref_activity_types.icon] || Info
                : Info
              const colorClass = activity.ref_activity_types?.color
                ? colorMap[activity.ref_activity_types.color] || colorMap.default
                : colorMap.default
              const isLast = idx === displayActivities.length - 1

              return (
                <motion.div
                  key={activity.id}
                  className="flex gap-3 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  layout
                >
                  {/* Timeline Gutter */}
                  <div className="relative flex-shrink-0 w-8 flex flex-col items-center">
                    {/* Icon Circle */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-background z-10 group-hover:scale-110 transition-transform ${colorClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {/* Vertical Line */}
                    {!isLast && (
                      <div className="flex-grow w-0.5 bg-muted mt-1"></div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 pb-1">
                    <div className="space-y-1.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-default">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-sm">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {activity.ref_activity_types?.label || activity.activity_type}
                            </Badge>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(new Date(activity.activity_date), 'M월 d일', { locale: ko })}
                        </span>
                      </div>

                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {!!activity.metadata.percentage && (
                            <Badge variant="secondary" className="text-xs">
                              {String(activity.metadata.percentage)}%
                            </Badge>
                          )}
                          {!!activity.metadata.raw_score && !!activity.metadata.max_score && (
                            <Badge variant="secondary" className="text-xs">
                              {String(activity.metadata.raw_score)}/{String(activity.metadata.max_score)}점
                            </Badge>
                          )}
                          {!!activity.metadata.subject && (
                            <Badge variant="outline" className="text-xs">
                              {String(activity.metadata.subject)}
                            </Badge>
                          )}
                          {!!activity.metadata.status && (
                            <Badge
                              variant={
                                activity.metadata.status === 'present'
                                  ? 'default'
                                  : activity.metadata.status === 'absent'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {String(activity.metadata.status)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
