"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DEFAULT_WIDGETS, DashboardWidget } from "@/types/dashboard"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Settings2,
  Eye,
  EyeOff,
  Layout,
  Save,
  RotateCcw,
  Grid3x3,
  Sparkles,
  BarChart3,
  Users,
  Package,
  GripVertical,
  Move,
} from "lucide-react"
import { cn } from "@/lib/utils"

const widgetInfo: Record<string, { description: string; category: 'essential' | 'analytics' | 'management' | 'optional' }> = {
  'stats-grid': { description: '주요 통계 지표를 한눈에 확인', category: 'essential' },
  'today-tasks': { description: '오늘 처리해야 할 작업 목록', category: 'essential' },
  'attendance-summary': { description: '오늘의 출석 현황과 수업 진행 상태', category: 'essential' },
  'weekly-performance': { description: '주간 학원 운영 성과 분석', category: 'analytics' },
  'recent-students': { description: '최근 등록된 학생 목록', category: 'management' },
  'today-communications': { description: '상담 일정과 생일 학생 알림', category: 'management' },
  'student-alerts': { description: '주의가 필요한 학생 알림', category: 'management' },
  'financial-snapshot': { description: '재무 현황과 수납 정보', category: 'optional' },
  'class-status': { description: '운영 중인 수업 현황', category: 'optional' },
  'quick-actions': { description: '자주 사용하는 기능 바로가기', category: 'optional' },
}

const categoryConfig = {
  essential: {
    label: '필수 위젯',
    icon: Sparkles,
    className: 'text-primary'
  },
  analytics: {
    label: '분석 도구',
    icon: BarChart3,
    className: 'text-green-600 dark:text-green-500'
  },
  management: {
    label: '관리 도구',
    icon: Users,
    className: 'text-purple-600 dark:text-purple-500'
  },
  optional: {
    label: '선택 위젯',
    icon: Package,
    className: 'text-muted-foreground'
  }
}

interface DraggableWidgetProps {
  widget: DashboardWidget
  isOverlay?: boolean
}

function DraggableWidget({ widget, isOverlay = false }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: widget.id,
    data: {
      widget,
    },
    disabled: isOverlay,
  })

  const style = isOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={cn(
        "relative p-3 rounded-lg border bg-card transition-all",
        isSortableDragging && "scale-105 shadow-lg z-50",
        isOverlay && "shadow-2xl border-primary/50",
        !widget.visible && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {!isOverlay && (
          <button
            className="mt-0.5 cursor-grab active:cursor-grabbing touch-none hover:text-primary transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {isOverlay && (
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary/60" />
            <span className="text-sm font-medium">{widget.title}</span>
            {!widget.visible && (
              <Badge variant="outline" className="text-xs">
                숨김
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {widgetInfo[widget.id]?.description}
          </p>
        </div>
      </div>
    </div>
  )
}

interface DroppableColumnProps {
  id: string
  widgets: DashboardWidget[]
  title: string
}

function DroppableColumn({ id, widgets, title }: DroppableColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: id,
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors",
          isOver ? "bg-primary" : "bg-primary/60"
        )} />
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="secondary" className="text-xs ml-auto">
          {widgets.filter(w => w.visible).length}개 표시
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[300px] p-3 rounded-lg border-2 transition-all duration-200",
          isOver && "border-primary bg-primary/10 scale-[1.02]",
          !isOver && "border-dashed border-muted-foreground/30 bg-muted/5"
        )}
      >
        <SortableContext
          items={widgets.map(w => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {widgets.length > 0 ? (
              widgets
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map(widget => (
                  <DraggableWidget key={widget.id} widget={widget} />
                ))
            ) : (
              <div className={cn(
                "p-8 text-center transition-opacity",
                isOver && "opacity-100",
                !isOver && "opacity-50"
              )}>
                <Move className={cn(
                  "h-8 w-8 mx-auto mb-2 transition-all",
                  isOver ? "text-primary scale-110" : "text-muted-foreground/30"
                )} />
                <p className={cn(
                  "text-sm transition-colors",
                  isOver ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {isOver ? "여기에 놓으세요!" : "위젯을 여기로 드래그하세요"}
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

interface DashboardEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgets: DashboardWidget[]
  onSave: (widgets: DashboardWidget[]) => void
}

export function DashboardEditDialog({ open, onOpenChange, widgets, onSave }: DashboardEditDialogProps) {
  const [editedWidgets, setEditedWidgets] = useState<DashboardWidget[]>(widgets)
  const [initialWidgets, setInitialWidgets] = useState<DashboardWidget[]>(JSON.parse(JSON.stringify(widgets))) // Deep copy for comparison
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setEditedWidgets(widgets)
      setInitialWidgets(JSON.parse(JSON.stringify(widgets)))
    }
  }, [open, widgets])

  // Check if there are actual changes by comparing with initial state
  const checkHasChanges = (newWidgets: DashboardWidget[]) => {
    if (newWidgets.length !== initialWidgets.length) return true

    return newWidgets.some((widget) => {
      const initialWidget = initialWidgets.find(w => w.id === widget.id)
      if (!initialWidget) return true

      return widget.visible !== initialWidget.visible ||
             widget.order !== initialWidget.order ||
             widget.column !== initialWidget.column
    })
  }

  const hasChanges = checkHasChanges(editedWidgets)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleToggleWidget = (widgetId: string) => {
    setEditedWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ))
  }

  const handleToggleAll = (visible: boolean) => {
    setEditedWidgets(prev => {
      // Check if any change is needed
      const needsChange = prev.some(widget => widget.visible !== visible)
      if (!needsChange) return prev

      return prev.map(widget => ({ ...widget, visible }))
    })
  }

  const handleReset = () => {
    setEditedWidgets(DEFAULT_WIDGETS)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setOverId(null)
      return
    }

    const activeWidget = editedWidgets.find(w => w.id === active.id)
    const overWidget = editedWidgets.find(w => w.id === over.id)

    if (!activeWidget) {
      setActiveId(null)
      setOverId(null)
      return
    }

    let newWidgets = [...editedWidgets]

    // If dropping on another widget
    if (overWidget) {
      const activeIndex = newWidgets.findIndex(w => w.id === active.id)
      const overIndex = newWidgets.findIndex(w => w.id === over.id)

      // Same column - just reorder
      if (activeWidget.column === overWidget.column) {
        newWidgets = arrayMove(newWidgets, activeIndex, overIndex)
        // Update order values
        const columnWidgets = newWidgets.filter(w => w.column === activeWidget.column)
        columnWidgets.forEach((widget, index) => {
          const widgetIndex = newWidgets.findIndex(w => w.id === widget.id)
          newWidgets[widgetIndex].order = index
        })
      } else {
        // Different column - move widget
        newWidgets[activeIndex] = {
          ...activeWidget,
          column: overWidget.column,
          order: overWidget.order
        }
        // Reorder widgets in both columns
        const columns: Array<'left' | 'right'> = ['left', 'right']
        columns.forEach(column => {
          const columnWidgets = newWidgets
            .filter(w => w.column === column)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          columnWidgets.forEach((widget, index) => {
            const widgetIndex = newWidgets.findIndex(w => w.id === widget.id)
            newWidgets[widgetIndex].order = index
          })
        })
      }
    } else if (over.id === 'left' || over.id === 'right') {
      // Dropping on column
      const targetColumn = over.id as 'left' | 'right'
      const activeIndex = newWidgets.findIndex(w => w.id === active.id)

      // Only move if changing columns
      if (activeWidget.column !== targetColumn) {
        newWidgets[activeIndex] = {
          ...activeWidget,
          column: targetColumn,
          order: newWidgets.filter(w => w.column === targetColumn).length
        }

        // Reorder source column
        const sourceColumnWidgets = newWidgets
          .filter(w => w.column === activeWidget.column && w.id !== active.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        sourceColumnWidgets.forEach((widget, index) => {
          const widgetIndex = newWidgets.findIndex(w => w.id === widget.id)
          newWidgets[widgetIndex].order = index
        })
      }
    }

    setEditedWidgets(newWidgets)
    setActiveId(null)
    setOverId(null)
  }

  const handleSave = () => {
    onSave(editedWidgets)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setEditedWidgets(widgets)
    onOpenChange(false)
  }

  const visibleCount = editedWidgets.filter(w => w.visible).length
  const hiddenCount = editedWidgets.filter(w => !w.visible).length
  const allVisible = visibleCount === editedWidgets.length
  const allHidden = hiddenCount === editedWidgets.length

  const widgetsByCategory = editedWidgets.reduce((acc, widget) => {
    const category = widgetInfo[widget.id]?.category || 'optional'
    if (!acc[category]) acc[category] = []
    acc[category].push(widget)
    return acc
  }, {} as Record<string, DashboardWidget[]>)

  const leftColumnWidgets = editedWidgets.filter(w => w.column === 'left')
  const rightColumnWidgets = editedWidgets.filter(w => w.column === 'right')
  const activeWidget = editedWidgets.find(w => w.id === activeId)

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">대시보드 편집</DialogTitle>
                <DialogDescription className="text-sm">
                  위젯을 표시하거나 숨기고, 드래그하여 레이아웃을 수정하세요
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Eye className="h-3 w-3 mr-1" />
                {visibleCount}개 표시
              </Badge>
              <Badge variant="outline">
                <EyeOff className="h-3 w-3 mr-1" />
                {hiddenCount}개 숨김
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="widgets" className="h-full">
            <div className="px-6 py-2">
              <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="widgets" className="gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  위젯 설정
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Layout className="h-4 w-4" />
                  레이아웃 편집
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[420px]">
              <TabsContent value="widgets" className="px-6 pb-4 space-y-6 mt-4">
                {/* Quick Actions */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">빠른 설정</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleAll(true)}
                      disabled={allVisible}
                      className="h-8"
                    >
                      모두 표시
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleAll(false)}
                      disabled={allHidden}
                      className="h-8"
                    >
                      모두 숨김
                    </Button>
                    <Separator orientation="vertical" className="h-4 mx-1" />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleReset}
                      className="h-8 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      초기화
                    </Button>
                  </div>
                </div>

                {/* Widgets by Category */}
                {Object.entries(categoryConfig).map(([category, config]) => {
                  const categoryWidgets = widgetsByCategory[category] || []
                  if (categoryWidgets.length === 0) return null
                  const Icon = config.icon

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", config.className)} />
                          <h3 className="text-sm font-semibold">
                            {config.label}
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {categoryWidgets.filter(w => w.visible).length}/{categoryWidgets.length}
                        </Badge>
                      </div>

                      <div className="grid gap-2">
                        {categoryWidgets.map(widget => (
                          <div
                            key={widget.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              widget.visible
                                ? "bg-background border-border"
                                : "bg-muted/30 border-muted"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Switch
                                id={widget.id}
                                checked={widget.visible}
                                onCheckedChange={() => handleToggleWidget(widget.id)}
                              />
                              <div className="flex-1 space-y-1">
                                <Label
                                  htmlFor={widget.id}
                                  className="text-sm font-medium cursor-pointer leading-none"
                                >
                                  {widget.title}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {widgetInfo[widget.id]?.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {widget.column === 'left' ? '왼쪽' : '오른쪽'}
                              </Badge>
                              {widget.visible ? (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              <TabsContent value="preview" className="px-6 pb-4 mt-4">
                <div className="mb-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">💡 팁:</span> 위젯을 드래그하여 순서를 변경하거나 다른 열로 이동할 수 있습니다.
                  </p>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={pointerWithin}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  modifiers={[]}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <DroppableColumn
                      id="left"
                      widgets={leftColumnWidgets}
                      title="왼쪽 열"
                    />
                    <DroppableColumn
                      id="right"
                      widgets={rightColumnWidgets}
                      title="오른쪽 열"
                    />
                  </div>

                  <DragOverlay
                    dropAnimation={{
                      sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                          active: {
                            opacity: "0.5",
                          },
                        },
                      }),
                    }}
                  >
                    {activeId && activeWidget ? (
                      <DraggableWidget widget={activeWidget} isOverlay={true} />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {hasChanges && (
                <span className="text-amber-600 dark:text-amber-500 font-medium">
                  • 변경사항이 있습니다
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                저장
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}