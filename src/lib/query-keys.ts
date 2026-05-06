/**
 * 중앙화된 React Query 키 팩토리
 *
 * 모든 쿼리/뮤테이션 키를 한 곳에서 관리하여 일관성을 보장합니다.
 * 계층 구조를 활용해 상위 키 무효화 시 하위 키도 자동으로 무효화됩니다.
 */
export const queryKeys = {
  currentUser: () => ['currentUser'] as const,

  dashboard: {
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
    list: () => ['consultations'] as const,
    detail: (id: string) => ['consultations', id] as const,
  },

  todos: {
    list: () => ['todos'] as const,
  },

  students: {
    all: () => ['students'] as const,
    list: (filters: Record<string, unknown>) => ['students', 'list', filters] as const,
    filterOptions: () => ['students', 'filterOptions'] as const,
  },

  textbooks: {
    all: () => ['textbooks'] as const,
    list: (filters: Record<string, unknown>) => ['textbooks', 'list', filters] as const,
  },

  guardians: {
    all: () => ['guardians'] as const,
    list: () => ['guardians', 'list'] as const,
  },

  reports: {
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
} as const
