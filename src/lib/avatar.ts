/**
 * Avatar generation utilities
 * Uses DiceBear API for default avatars
 */

export type AvatarStyle = 'big-ears' | 'big-ears-neutral'

/**
 * Generate a default avatar URL based on student information
 * @param seed - Unique identifier (student ID or name)
 * @returns Avatar URL
 */
export function getDefaultAvatar(seed: string): string {
  // Use DiceBear API v9 with big-ears style
  const baseUrl = 'https://api.dicebear.com/9.x'
  const style = 'big-ears'

  // Generate avatar with seed for consistency
  return `${baseUrl}/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
}

/**
 * Get student avatar URL (uploaded or default)
 * @param profileImageUrl - Uploaded profile image URL
 * @param studentId - Student ID for seed
 * @param studentName - Student name for seed
 * @returns Avatar URL
 */
export function getStudentAvatar(
  profileImageUrl: string | null | undefined,
  studentId: string,
  studentName: string
): string {
  if (profileImageUrl) {
    return profileImageUrl
  }

  // Use student ID as seed for consistent avatars
  return getDefaultAvatar(studentId || studentName)
}
