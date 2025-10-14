"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// 출시일: 현재로부터 7일 후
const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export function HeroSection() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = LAUNCH_DATE.getTime() - Date.now()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])
  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />

      {/* 3D 애니메이션 배경 요소 */}
      <motion.div
        className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* 메인 콘텐츠 */}
      <div className="container relative z-10 flex min-h-[90vh] flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex max-w-4xl flex-col items-center gap-8"
        >
          {/* 배지 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            AI 기반 학원 관리 시스템
          </motion.div>

          {/* 출시 카운트다운 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-6 py-4 backdrop-blur-sm"
          >
            <Clock className="h-5 w-5 text-orange-500" />
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="text-muted-foreground">출시까지</span>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums text-orange-500">
                    {timeLeft.days}
                  </span>
                  <span className="text-xs text-muted-foreground">일</span>
                </div>
                <span className="text-muted-foreground">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums text-orange-500">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-muted-foreground">시간</span>
                </div>
                <span className="text-muted-foreground">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums text-orange-500">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-muted-foreground">분</span>
                </div>
                <span className="text-muted-foreground">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold tabular-nums text-orange-500">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-xs text-muted-foreground">초</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 메인 헤드라인 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            흩어진 학원 업무,
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              스마트하게 통합
            </span>
            하세요
          </motion.h1>

          {/* 서브타이틀 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-2xl text-lg text-muted-foreground sm:text-xl"
          >
            출결 관리부터 성적 분석, 학부모 소통까지.
            <br />
            Acadesk 하나로 학원 운영의 모든 것을 자동화하세요.
          </motion.p>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="group bg-orange-500 text-base text-white hover:bg-orange-600"
            >
              <Link href="#pre-registration">
                사전 등록하기
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="#features">더 알아보기</Link>
            </Button>
          </motion.div>

          {/* 신뢰 배지 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              출시 알림 받기
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              얼리버드 혜택
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              선착순 100명 무료
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* 하단 그라디언트 페이드 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
