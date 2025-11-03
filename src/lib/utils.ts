import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 이름에서 이니셜 추출
 */
export function getInitials(name: string): string {
  if (!name) return "?"
  const parts = name.trim().split(" ")
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toISOString().split("T")[0]
}

/**
 * 한국어 날짜 포맷팅 (YYYY년 M월 D일)
 */
export function formatKoreanDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 간단한 한국어 날짜 포맷팅 (M월 D일)
 */
export function formatKoreanDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}월 ${day}일`
}

/**
 * 상대 시간 표시 (예: "2시간 전")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "방금 전"
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`
  return formatDate(d)
}

/**
 * 전화번호 포맷팅 (010-XXXX-XXXX)
 * @param phone - 전화번호 (하이픈 유무 상관없음)
 * @returns 포맷된 전화번호 (예: 010-1234-5678)
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ""

  // 숫자만 추출
  const cleaned = phone.replace(/\D/g, "")

  // 한국 휴대폰 번호 (010-XXXX-XXXX)
  if (cleaned.length === 11 && cleaned.startsWith("01")) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }

  // 한국 일반전화 (02-XXXX-XXXX 또는 0XX-XXX-XXXX)
  if (cleaned.length === 10 && cleaned.startsWith("02")) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }

  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  // 그 외는 원본 반환
  return phone
}
