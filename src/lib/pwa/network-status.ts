type Listener = (online: boolean) => void

const listeners = new Set<Listener>()
let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('online', () => notify(true))
  window.addEventListener('offline', () => notify(false))
}

function notify(online: boolean) {
  listeners.forEach((fn) => fn(online))
}

export function subscribeNetworkStatus(listener: Listener): () => void {
  init()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}
