'use client'

import { motion } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { Target, TrendingUp, CheckCircle } from 'lucide-react'

interface KPIs {
  attendanceRate: number
  avgScore: number
  homeworkRate: number
}

interface StudentKpiCardsProps {
  kpis: KPIs
}

export function StudentKpiCards({ kpis }: StudentKpiCardsProps) {
  const cards = [
    {
      label: '출석률',
      value: `${kpis.attendanceRate}%`,
      subtitle: '최근 30일 기준',
      icon: Target,
      delay: 0.2,
    },
    {
      label: '성적 평균',
      value: `${kpis.avgScore}점`,
      subtitle: '최근 10회 시험',
      icon: TrendingUp,
      delay: 0.3,
    },
    {
      label: '과제 완료율',
      value: `${kpis.homeworkRate}%`,
      subtitle: '최근 10개 과제',
      icon: CheckCircle,
      delay: 0.4,
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: card.delay }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.subtitle}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <card.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
