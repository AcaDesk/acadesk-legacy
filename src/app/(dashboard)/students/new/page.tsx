import { redirect } from 'next/navigation'

/**
 * 학생 등록 페이지는 다이얼로그로 통합되었습니다.
 * /students 페이지에서 "학생 추가" 버튼을 통해 다이얼로그를 열어 학생을 등록하세요.
 */
export default function NewStudentPage() {
  redirect('/students')
}
