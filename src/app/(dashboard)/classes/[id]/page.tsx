import { notFound } from 'next/navigation'
import { getClassById, getClassStudents } from '@/app/actions/classes'
import { ClassDetailClient } from './class-detail-client'

interface ClassDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params

  // Fetch data in parallel on server
  const [classResult, studentsResult] = await Promise.all([
    getClassById(id),
    getClassStudents(id),
  ])

  // Handle not found
  if (!classResult.success || !classResult.data) {
    notFound()
  }

  const students = studentsResult.success && studentsResult.data
    ? studentsResult.data
    : []

  return (
    <ClassDetailClient
      classData={classResult.data}
      students={students}
    />
  )
}
