"use client"

import { motion } from "framer-motion"
import {
  Users,
  BarChart3,
  Bell,
  FileText,
  Calendar,
  Shield,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "통합 학생 관리",
    description: "학생 정보, 출결, 성적을 한눈에 관리하세요. 모든 데이터가 하나로.",
  },
  {
    icon: BarChart3,
    title: "실시간 성적 분석",
    description:
      "자동 생성되는 그래프와 리포트로 학생의 성장을 시각화하고 추적하세요.",
  },
  {
    icon: Bell,
    title: "자동 알림 시스템",
    description: "출결, 성적, 공지사항을 학부모에게 자동으로 전송합니다.",
  },
  {
    icon: FileText,
    title: "스마트 리포트",
    description: "클릭 한 번으로 전문적인 학습 리포트를 자동 생성하고 발송하세요.",
  },
  {
    icon: Calendar,
    title: "일정 관리",
    description: "수업, 상담, 행사 일정을 효율적으로 관리하고 공유하세요.",
  },
  {
    icon: Shield,
    title: "안전한 데이터",
    description:
      "엔터프라이즈급 보안으로 학생과 학원 데이터를 안전하게 보호합니다.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            학원 운영의 모든 것을 하나로
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Acadesk는 학원 관리에 필요한 모든 기능을 제공합니다.
            <br />
            복잡한 업무를 단순하게, 시간을 절약하고 효율을 높이세요.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-7xl gap-8 sm:mt-20 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="inline-flex rounded-lg bg-primary/10 p-3 text-primary ring-4 ring-primary/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
