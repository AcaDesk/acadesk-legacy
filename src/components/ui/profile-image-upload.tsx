'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Upload, X, Loader2 } from 'lucide-react'
import { getStudentAvatar } from '@/lib/avatar'

interface ProfileImageUploadProps {
  currentImageUrl?: string | null
  studentId?: string
  studentName?: string
  gender?: string | null
  onImageUploaded: (url: string) => void
}

export function ProfileImageUpload({
  currentImageUrl,
  studentId,
  studentName = 'Student',
  gender,
  onImageUploaded,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast({
        title: '파일 형식 오류',
        description: 'JPG, PNG, WebP, GIF 형식만 업로드 가능합니다.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '파일 크기 오류',
        description: '파일 크기는 5MB 이하여야 합니다.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)

      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('student-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-profiles')
        .getPublicUrl(filePath)

      setPreviewUrl(publicUrl)
      onImageUploaded(publicUrl)

      toast({
        title: '업로드 완료',
        description: '프로필 이미지가 업로드되었습니다.',
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: '업로드 오류',
        description: '이미지를 업로드하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onImageUploaded('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayUrl = previewUrl || (studentId ? getStudentAvatar(null, studentId, studentName, gender) : null)

  return (
    <div className="space-y-4">
      <Label>프로필 사진</Label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="프로필 사진"
              className="h-full w-full object-cover"
            />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                이미지 선택
              </>
            )}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              제거
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, GIF (최대 5MB)
          </p>
        </div>
      </div>
    </div>
  )
}
