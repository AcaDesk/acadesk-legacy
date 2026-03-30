import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ReportStoreState {
  skipComment: boolean
  setSkipComment: (value: boolean) => void
  skipAttendanceRate: boolean
  setSkipAttendanceRate: (value: boolean) => void
  skipAttendanceCalendar: boolean
  setSkipAttendanceCalendar: (value: boolean) => void
}

export const useReportStore = create<ReportStoreState>()(
  persist(
    (set) => ({
      skipComment: false,
      setSkipComment: (value) => set({ skipComment: value }),
      skipAttendanceRate: false,
      setSkipAttendanceRate: (value) => set({ skipAttendanceRate: value }),
      skipAttendanceCalendar: false,
      setSkipAttendanceCalendar: (value) => set({ skipAttendanceCalendar: value }),
    }),
    {
      name: 'acadesk-report',
      partialize: (state) => ({
        skipComment: state.skipComment,
        skipAttendanceRate: state.skipAttendanceRate,
        skipAttendanceCalendar: state.skipAttendanceCalendar,
      }),
    }
  )
)
