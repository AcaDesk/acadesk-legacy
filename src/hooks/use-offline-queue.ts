'use client'

import { useEffect, useState } from 'react'
import { getPendingMutations } from '@/lib/pwa/indexeddb'

export function useOfflineQueue(tenantId?: string) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const mutations = await getPendingMutations(tenantId)
        if (mounted) setPendingCount(mutations.length)
      } catch {
        // IDB 접근 실패 시 무시
      }
    }

    check()
    const interval = setInterval(check, 3000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [tenantId])

  return { pendingCount }
}
