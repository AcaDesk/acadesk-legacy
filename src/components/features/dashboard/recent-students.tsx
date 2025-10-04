"use client"

import { motion } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StudentDTO } from "@/domain/entities/student.entity"
import { getInitials } from "@/lib/utils"

interface RecentStudentsProps {
  students: StudentDTO[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export function RecentStudents({ students }: RecentStudentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 등록 학생</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {students.length === 0 ? (
            <motion.p
              className="text-center text-sm text-muted-foreground"
              variants={itemVariants}
            >
              등록된 학생이 없습니다
            </motion.p>
          ) : (
            students.map((student) => (
              <motion.div
                key={student.id}
                className="flex items-center justify-between"
                variants={itemVariants}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.grade}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={student.status === "활동중" ? "default" : "secondary"}
                >
                  {student.status}
                </Badge>
              </motion.div>
            ))
          )}
        </motion.div>
      </CardContent>
    </Card>
  )
}
