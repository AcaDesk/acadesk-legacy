'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Badge } from '@ui/badge';
import { GripVertical, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetDragOverlayProps {
  title: string;
}

export function WidgetDragOverlay({ title }: WidgetDragOverlayProps) {
  return (
    <Card className={cn(
      "shadow-2xl opacity-95 border-2 border-primary ring-4 ring-primary/30",
      "rotate-2 scale-105 backdrop-blur-sm bg-background/95",
      "animate-in zoom-in-95 fade-in duration-200"
    )}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20 animate-pulse">
              <GripVertical className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <Badge variant="default" className="gap-1.5 animate-pulse shadow-lg">
            <Move className="h-3 w-3" />
            <span className="font-medium">이동 중</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <div className="h-28 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-4">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 mx-auto shadow-lg">
              <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-75" />
              <GripVertical className="h-7 w-7 text-primary relative z-10 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">위치를 선택하세요</p>
              <p className="text-xs text-muted-foreground">원하는 컬럼으로 드래그하세요</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}