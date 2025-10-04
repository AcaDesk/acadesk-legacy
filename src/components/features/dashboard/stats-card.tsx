"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  index: number
  href?: string
  variant?: "default" | "primary" | "success" | "warning" | "danger"
}

const variantStyles = {
  default: "text-foreground",
  primary: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
  warning: "text-orange-600 dark:text-orange-400",
  danger: "text-red-600 dark:text-red-400",
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  index,
  href,
  variant = "default",
}: StatsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.1,
        duration: 0.4,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
    >
      <Card className={cn(href && "cursor-pointer hover:shadow-md")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <motion.div
            className={cn("text-2xl font-bold", variantStyles[variant])}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            {value}
          </motion.div>
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
            >
              <Badge
                variant={trend.isPositive ? "default" : "secondary"}
                className="mt-2"
              >
                <TrendIcon className="mr-1 h-3 w-3" />
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </Badge>
            </motion.div>
          )}
          {description && (
            <p className="mt-2 text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}
