import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReportStoreState {
  skipComment: boolean
  setSkipComment: (value: boolean) => void
}

export const useReportStore = create<ReportStoreState>()(
  persist(
    (set) => ({
      skipComment: false,
      setSkipComment: (value) => set({ skipComment: value }),
    }),
    {
      name: 'acadesk-report',
      partialize: (state) => ({ skipComment: state.skipComment }),
    }
  )
)
