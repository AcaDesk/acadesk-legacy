'use client'

/**
 * 파일 업로드 컴포넌트
 */

import { useCallback, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeMB?: number
}

export function FileUpload({
  onFileSelect,
  accept = '.xlsx,.xls',
  maxSizeMB = 5,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const validateFile = useCallback(
    (file: File): boolean => {
      // 파일 크기 체크
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setError(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`)
        return false
      }

      // 파일 확장자 체크
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !['xlsx', 'xls'].includes(extension)) {
        setError('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
        return false
      }

      setError(null)
      return true
    },
    [maxSizeMB]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect, validateFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect, validateFile]
  )

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    setError(null)
  }, [])

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background',
          error ? 'border-destructive' : ''
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          onChange={handleFileInput}
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="rounded-full p-1 hover:bg-destructive/10"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              파일을 드래그하거나 클릭하여 업로드하세요
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              엑셀 파일(.xlsx, .xls) - 최대 {maxSizeMB}MB
            </p>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
