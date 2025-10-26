import { redirect } from 'next/navigation'

/**
 * Redirect /grades/exams to /grades
 *
 * The exam list is now the main grades page for better UX.
 * This redirect maintains backward compatibility for existing links.
 */
export default function ExamsRedirectPage() {
  redirect('/grades')
}
