import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { AlertTriangle } from 'lucide-react'
import type { BatchJobItem } from '@/core/types/batch.types'

interface JobErrorGroupListProps {
  items: BatchJobItem[]
}

export function JobErrorGroupList({ items }: JobErrorGroupListProps) {
  const failedItems = items.filter((i) => i.status === 'failed')
  if (failedItems.length === 0) return null

  const groups = new Map<string, BatchJobItem[]>()
  for (const item of failedItems) {
    const category = item.error_category ?? '기타'
    const existing = groups.get(category) ?? []
    existing.push(item)
    groups.set(category, existing)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          에러 그룹 ({failedItems.length}건)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from(groups.entries()).map(([category, categoryItems]) => (
          <div key={category} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{category}</span>
              <span className="text-xs text-muted-foreground">{categoryItems.length}건</span>
            </div>
            <div className="space-y-1 pl-4">
              {categoryItems.slice(0, 5).map((item) => (
                <div key={item.id} className="text-xs text-muted-foreground">
                  <span className="font-medium">{item.target_name ?? item.target_id}</span>
                  {item.error_message && <span className="ml-2">- {item.error_message}</span>}
                </div>
              ))}
              {categoryItems.length > 5 && (
                <p className="text-xs text-muted-foreground">외 {categoryItems.length - 5}건...</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
