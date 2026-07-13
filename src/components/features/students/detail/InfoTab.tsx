'use client'

import { motion } from 'motion/react'
import { useStudentDetail } from '@/hooks/use-student-detail'
import { StudentBasicInfo } from './StudentBasicInfo'
import { StudentSiblingsCard } from './StudentSiblingsCard'
import { ChangeHistorySection } from './ChangeHistorySection'

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
  const { student } = useStudentDetail()

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

      {/* Change History */}
      <motion.div variants={itemVariants}>
        <ChangeHistorySection studentId={student.id} />
      </motion.div>
    </motion.div>
  )
}
