'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  const mql = window.matchMedia('(display-mode: standalone)')
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari standalone 감지
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ('standalone' in window.navigator && (window.navigator as any).standalone) return true
  // 표준 display-mode 감지
  return window.matchMedia('(display-mode: standalone)').matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useStandaloneMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
