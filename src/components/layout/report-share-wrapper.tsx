'use client'

import { useEffect } from 'react'

export function ReportShareWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Enable scroll for this page
    const html = document.documentElement
    const body = document.body
    
    const originalHtmlOverflow = html.style.overflow
    const originalBodyOverflow = body.style.overflow
    
    html.style.overflow = 'auto'
    body.style.overflow = 'auto'
    
    // Cleanup on unmount
    return () => {
      html.style.overflow = originalHtmlOverflow
      body.style.overflow = originalBodyOverflow
    }
  }, [])

  return <>{children}</>
}
