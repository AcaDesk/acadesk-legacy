/**
 * 초대 토큰 localStorage 관리
 *
 * 문제: 초대 링크(/auth/invite/accept?token=xxx)에서 중간에 창을 닫으면 토큰 소실
 * 해결: localStorage에 토큰 보존 → 다음 방문 시 복구
 */

const STORAGE_KEY = 'inviteToken'

export const inviteTokenStore = {
  /**
   * 초대 토큰 저장
   */
  save(token: string): void {
    if (typeof window !== 'undefined' && token) {
      localStorage.setItem(STORAGE_KEY, token)
      console.log('[inviteTokenStore] Token saved:', token.substring(0, 8) + '...')
    }
  },

  /**
   * 초대 토큰 조회
   */
  get(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEY)
      if (token) {
        console.log('[inviteTokenStore] Token retrieved:', token.substring(0, 8) + '...')
      }
      return token
    }
    return null
  },

  /**
   * 초대 토큰 제거 (수락 성공 후 호출)
   */
  remove(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      console.log('[inviteTokenStore] Token removed')
    }
  },

  /**
   * 토큰 존재 여부 확인
   */
  has(): boolean {
    return !!this.get()
  },
}
