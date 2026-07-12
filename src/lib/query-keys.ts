/**
 * 중앙화된 React Query 키 팩토리
 *
 * 모든 쿼리/뮤테이션 키를 한 곳에서 관리하여 일관성을 보장합니다.
 * 계층 구조를 활용해 상위 키 무효화 시 하위 키도 자동으로 무효화됩니다.
 */
export const queryKeys = {
  currentUser: () => ['currentUser'] as const,

  dashboard: {
    data: () => ['dashboardData'] as const,
    kpi: (period: string) => ['dashboard', 'kpi', period] as const,
    drilldown: (widgetId: string, period: string) =>
      ['dashboard', 'drilldown', widgetId, period] as const,
  },

  grades: {
    retests: () => ['grades', 'retests'] as const,
    exams: () => ['grades', 'exams'] as const,
    exam: (id: string) => ['grades', 'exam', id] as const,
  },

  consultations: {
    all: () => ['consultations'] as const,
    list: (filters: Record<string, unknown>) => ['consultations', 'list', filters] as const,
    pageMeta: () => ['consultations', 'pageMeta'] as const,
    detail: (id: string) => ['consultations', id] as const,
  },

  todos: {
    list: () => ['todos'] as const,
    templates: () => ['todos', 'templates'] as const,
    template: (id: string) => ['todos', 'templates', id] as const,
    pendingVerification: () => ['todos', 'pendingVerification'] as const,
  },

  students: {
    all: () => ['students'] as const,
    list: (filters: Record<string, unknown>) => ['students', 'list', filters] as const,
    enriched: () => ['students', 'enriched'] as const,
    filterOptions: () => ['students', 'filterOptions'] as const,
    guardians: (studentId: string) => ['students', studentId, 'guardians'] as const,
    availableGuardians: (studentId: string) =>
      ['students', studentId, 'availableGuardians'] as const,
    activityLogs: (studentId: string, limit: number) =>
      ['students', studentId, 'activityLogs', limit] as const,
    changeLogs: (studentId: string) => ['students', studentId, 'changeLogs'] as const,
  },

  classSessions: {
    recent: (classId: string, limit: number) =>
      ['classSessions', 'recent', classId, limit] as const,
  },

  tenantCodes: {
    byType: (type: string) => ['tenantCodes', type] as const,
  },

  classes: {
    active: () => ['classes', 'active'] as const,
  },

  points: {
    types: () => ['points', 'types'] as const,
    balance: (studentId: string) => ['points', 'balance', studentId] as const,
    history: (studentId: string) => ['points', 'history', studentId] as const,
  },

  textbooks: {
    all: () => ['textbooks'] as const,
    list: (filters: Record<string, unknown>) => ['textbooks', 'list', filters] as const,
    enriched: () => ['textbooks', 'enriched'] as const,
  },

  guardians: {
    all: () => ['guardians'] as const,
    list: () => ['guardians', 'list'] as const,
  },

  reports: {
    lists: () => ['reports', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['reports', 'list', filters] as const,
    preview: (studentId: string, period: unknown) => ['reports', 'preview', studentId, period] as const,
    templates: (context: unknown) => ['reports', 'templates', context] as const,
  },

  eventSubscriptions: {
    all: () => ['eventSubscriptions'] as const,
    list: () => ['eventSubscriptions', 'list'] as const,
  },

  messagingConfig: {
    detail: () => ['messagingConfig', 'detail'] as const,
  },

  messaging: {
    history: (filters: Record<string, unknown>) => ['messaging', 'history', filters] as const,
    statistics: (filters: Record<string, unknown>) => ['messaging', 'statistics', filters] as const,
    templates: () => ['messaging', 'templates'] as const,
    balance: () => ['messaging', 'balance'] as const,
  },

  subjects: {
    all: () => ['subjects'] as const,
    listWithStats: () => ['subjects', 'list', 'with-stats'] as const,
  },
} as const
