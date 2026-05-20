import { PageWrapper } from '@/components/layout/page-wrapper'
import { getStudentsMaster } from '@/app/actions/students/queries'
import { NewHomeworkForm } from './new-homework-form'

export default async function NewHomeworkPage() {
  const result = await getStudentsMaster()
  const studentsMaster = result.data

  return (
    <PageWrapper>
      <NewHomeworkForm studentsMaster={studentsMaster} />
    </PageWrapper>
  )
}
