"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface AuthBrandingCanvasProps {
  title: string
  subtitle: string
  features?: Array<{ icon: React.ReactNode; text: string }>
}

// 고정된 파티클 위치 (hydration mismatch 방지)
const PARTICLE_POSITIONS = [
  { left: 12, top: 15, duration: 4.2, delay: 0.3 },
  { left: 88, top: 22, duration: 3.8, delay: 1.1 },
  { left: 45, top: 8, duration: 4.7, delay: 0.7 },
  { left: 65, top: 78, duration: 3.5, delay: 1.8 },
  { left: 23, top: 45, duration: 4.1, delay: 0.2 },
  { left: 91, top: 55, duration: 3.9, delay: 1.5 },
  { left: 8, top: 68, duration: 4.4, delay: 0.9 },
  { left: 72, top: 33, duration: 3.6, delay: 1.2 },
  { left: 38, top: 85, duration: 4.0, delay: 0.5 },
  { left: 55, top: 12, duration: 3.7, delay: 1.6 },
  { left: 18, top: 92, duration: 4.3, delay: 0.4 },
  { left: 82, top: 41, duration: 3.8, delay: 1.0 },
  { left: 48, top: 58, duration: 4.5, delay: 0.8 },
  { left: 95, top: 25, duration: 3.4, delay: 1.7 },
  { left: 28, top: 71, duration: 4.2, delay: 0.6 },
  { left: 62, top: 5, duration: 3.9, delay: 1.3 },
  { left: 5, top: 38, duration: 4.1, delay: 0.1 },
  { left: 75, top: 88, duration: 3.6, delay: 1.9 },
  { left: 41, top: 62, duration: 4.4, delay: 0.3 },
  { left: 68, top: 18, duration: 3.7, delay: 1.4 },
]

export function AuthBrandingCanvas({
  title,
  subtitle,
  features = [],
}: AuthBrandingCanvasProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* 추상적인 배경 레이어 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />

      {/* 3D 애니메이션 원형 요소들 */}
      <motion.div
        className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl"
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
          scale: [1, 1.1, 1],
        }}
        transition={{
          x: { duration: 0.5 },
          y: { duration: 0.5 },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      <motion.div
        className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 blur-3xl"
        animate={{
          x: -mousePosition.x * 0.5,
          y: -mousePosition.y * 0.5,
          scale: [1, 1.2, 1],
        }}
        transition={{
          x: { duration: 0.5 },
          y: { duration: 0.5 },
          scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "4rem 4rem",
        }}
      />

      {/* 콘텐츠 레이어 */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl space-y-8"
        >
          {/* 메인 타이틀 */}
          <motion.h1
            className="text-5xl font-bold tracking-tight lg:text-6xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {title}
          </motion.h1>

          {/* 서브타이틀 */}
          <motion.p
            className="text-xl text-muted-foreground lg:text-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {subtitle}
          </motion.p>

          {/* 기능 리스트 */}
          {features.length > 0 && (
            <motion.div
              className="grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-primary/10 bg-background/50 p-6 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 },
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative flex flex-col items-center gap-3">
                    <motion.div
                      className="text-primary"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {feature.icon}
                    </motion.div>
                    <p className="text-sm font-medium">{feature.text}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 플로팅 파티클 효과 */}
      {PARTICLE_POSITIONS.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/30"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  )
}
