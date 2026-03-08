import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KPIPeriod } from '@/app/actions/dashboard-kpi'
import type { DrilldownWidgetId } from '@/app/actions/dashboard-drilldown'

interface DashboardState {
  isEditMode: boolean
  setEditMode: (v: boolean) => void
  maximizedWidgetId: string | null
  setMaximizedWidgetId: (id: string | null) => void
  kpiPeriod: KPIPeriod
  setKpiPeriod: (p: KPIPeriod) => void
  autoRefreshEnabled: boolean
  toggleAutoRefresh: () => void
  drilldownWidgetId: DrilldownWidgetId | null
  setDrilldownWidgetId: (id: DrilldownWidgetId | null) => void
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      isEditMode: false,
      setEditMode: (v) => set({ isEditMode: v }),
      maximizedWidgetId: null,
      setMaximizedWidgetId: (id) => set({ maximizedWidgetId: id }),
      kpiPeriod: 'today',
      setKpiPeriod: (p) => set({ kpiPeriod: p }),
      autoRefreshEnabled: true,
      toggleAutoRefresh: () =>
        set((state) => ({ autoRefreshEnabled: !state.autoRefreshEnabled })),
      drilldownWidgetId: null,
      setDrilldownWidgetId: (id) => set({ drilldownWidgetId: id }),
    }),
    {
      name: 'acadesk-dashboard',
      // autoRefreshEnabled, kpiPeriod만 localStorage에 영속화
      partialize: (state) => ({
        autoRefreshEnabled: state.autoRefreshEnabled,
        kpiPeriod: state.kpiPeriod,
      }),
    }
  )
)
