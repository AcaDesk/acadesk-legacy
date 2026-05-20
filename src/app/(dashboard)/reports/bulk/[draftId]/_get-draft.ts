import { cache } from 'react'
import { getBatchDraft } from '@/app/actions/batch/drafts'

/**
 * React.cache()를 이용해 동일한 서버 렌더 요청 내에서
 * layout.tsx와 page.tsx 간의 중복 DB 쿼리를 제거합니다.
 */
export const getDraftCached = cache(async (draftId: string) => getBatchDraft(draftId))
