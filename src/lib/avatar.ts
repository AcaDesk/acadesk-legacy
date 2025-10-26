/**
 * Avatar generation utilities
 * Generates initials-based avatars with unique colors
 */

// Predefined color palette for avatars (Google/Microsoft style)
const AVATAR_COLORS = [
  { bg: '#4285F4', text: '#FFFFFF' }, // Blue
  { bg: '#34A853', text: '#FFFFFF' }, // Green
  { bg: '#FBBC04', text: '#000000' }, // Yellow
  { bg: '#EA4335', text: '#FFFFFF' }, // Red
  { bg: '#9334E6', text: '#FFFFFF' }, // Purple
  { bg: '#F97316', text: '#FFFFFF' }, // Orange
  { bg: '#06B6D4', text: '#FFFFFF' }, // Cyan
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
]

/**
 * Simple hash function to convert string to number
 * @param str - String to hash
 * @returns Hash number
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Get initials from name (supports Korean and English)
 * @param name - Student name
 * @returns First character(s) of the name
 */
export function getInitials(name: string): string {
  if (!name || name.trim() === '') return '?'

  const trimmedName = name.trim()

  // For Korean names, use the first character (surname)
  const firstChar = trimmedName.charAt(0)

  // Check if it's Korean (Hangul)
  const isKorean = /[가-힣]/.test(firstChar)

  if (isKorean) {
    return firstChar
  }

  // For English names, use first letter of first word
  const words = trimmedName.split(' ')
  return words[0].charAt(0).toUpperCase()
}

/**
 * Get avatar color based on student ID
 * @param studentId - Student ID for consistent color generation
 * @returns Color object with background and text colors
 */
export function getAvatarColor(studentId: string): { bg: string; text: string } {
  const hash = hashCode(studentId)
  const index = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Check if profile image URL is valid
 * @param profileImageUrl - Profile image URL
 * @returns True if valid, false otherwise
 */
export function hasProfileImage(profileImageUrl: string | null | undefined): boolean {
  return !!(profileImageUrl && profileImageUrl.trim() !== '')
}

/**
 * Get student avatar data (for use with Avatar component)
 * @param profileImageUrl - Uploaded profile image URL
 * @param studentId - Student ID for color generation
 * @param studentName - Student name for initials
 * @returns Object containing avatar data
 */
export function getStudentAvatarData(
  profileImageUrl: string | null | undefined,
  studentId: string,
  studentName: string
) {
  return {
    hasImage: hasProfileImage(profileImageUrl),
    imageUrl: profileImageUrl || undefined,
    initials: getInitials(studentName),
    color: getAvatarColor(studentId),
  }
}

// Backwards compatibility: keep getStudentAvatar for existing code
export function getStudentAvatar(
  profileImageUrl: string | null | undefined,
  studentId: string,
  studentName: string
): string {
  // If profile image exists, return it
  if (hasProfileImage(profileImageUrl)) {
    return profileImageUrl!
  }

  // Return a placeholder for now (will be replaced by Avatar component)
  return ''
}
