'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { differenceInYears } from 'date-fns'

interface Sibling {
  id: string
  sibling_id: string
  sibling_code: string
  sibling_name: string
  sibling_grade: string | null
  sibling_birth_date: string | null
}

interface StudentSiblingsCardProps {
  studentId: string
}

export function StudentSiblingsCard({ studentId }: StudentSiblingsCardProps) {
  const [siblings, setSiblings] = useState<Sibling[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSiblings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function loadSiblings() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_student_siblings')
        .select('*')
        .eq('student_id', studentId)

      if (error) throw error

      setSiblings(data || [])
    } catch (error) {
      console.error('Error loading siblings:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    return differenceInYears(new Date(), new Date(birthDate))
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            형제 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          형제 정보 {siblings.length > 0 && `(${siblings.length}명)`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {siblings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            등록된 형제 정보가 없습니다
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {siblings.map((sibling) => (
            <Link
              key={sibling.id}
              href={`/students/${sibling.sibling_id}`}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                {sibling.sibling_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {sibling.sibling_name}
                  </p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {sibling.sibling_code}
                  </p>
                  {sibling.sibling_grade && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {sibling.sibling_grade}
                      </Badge>
                    </>
                  )}
                  {sibling.sibling_birth_date && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {calculateAge(sibling.sibling_birth_date)}세
                      </span>
                    </>
                  )}
                </div>
              </div>
            </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
