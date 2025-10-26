'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@ui/avatar'
import { getStudentAvatarData } from '@/lib/avatar'
import { cn } from '@/lib/utils'

interface StudentAvatarProps {
  profileImageUrl?: string | null
  studentId: string
  studentName: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

export function StudentAvatar({
  profileImageUrl,
  studentId,
  studentName,
  className,
  size = 'md',
}: StudentAvatarProps) {
  const avatarData = getStudentAvatarData(profileImageUrl, studentId, studentName)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarData.hasImage && avatarData.imageUrl && (
        <AvatarImage src={avatarData.imageUrl} alt={studentName} />
      )}
      <AvatarFallback
        style={{
          backgroundColor: avatarData.color.bg,
          color: avatarData.color.text,
        }}
        className="font-semibold"
      >
        {avatarData.initials}
      </AvatarFallback>
    </Avatar>
  )
}
