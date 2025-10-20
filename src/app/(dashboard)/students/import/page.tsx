/**
 * 학생 일괄 등록 페이지
 */

import { PageWrapper } from '@/components/layout/page-wrapper'
import { StudentImportWizard } from '@/components/features/students/import/student-import-wizard'

export const metadata = {
  title: '학생 일괄 등록 | Acadesk',
  description: '엑셀 파일을 통한 학생 일괄 등록',
}

export default function StudentImportPage() {
  return (
    <PageWrapper title="학생 일괄 등록" description="엑셀 파일을 통해 여러 학생을 한 번에 등록할 수 있습니다.">
      <StudentImportWizard />
    </PageWrapper>
  )
}
