"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, X, Eye, EyeOff, Save, GripVertical } from "lucide-react"
import { DashboardWidget } from "@/types/dashboard"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DashboardEditModeProps {
  widgets: DashboardWidget[]
  onSave: (widgets: DashboardWidget[]) => void
}

interface SortableWidgetItemProps {
  widget: DashboardWidget
  onToggle: (id: string) => void
}

function SortableWidgetItem({ widget, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Checkbox
        id={widget.id}
        checked={widget.visible}
        onCheckedChange={() => onToggle(widget.id)}
      />
      <label
        htmlFor={widget.id}
        className="flex-1 text-sm font-medium cursor-pointer"
      >
        {widget.title}
      </label>
      {widget.visible ? (
        <Eye className="h-4 w-4 text-muted-foreground" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  )
}

export function DashboardEditMode({ widgets, onSave }: DashboardEditModeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editedWidgets, setEditedWidgets] = useState<DashboardWidget[]>(widgets)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleToggleVisibility = (id: string) => {
    setEditedWidgets(prev =>
      prev.map(widget =>
        widget.id === id ? { ...widget, visible: !widget.visible } : widget
      )
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeWidget = editedWidgets.find(w => w.id === active.id)
    const overWidget = editedWidgets.find(w => w.id === over.id)

    if (!activeWidget || !overWidget) return

    // Check if dragging to a different container
    if (activeWidget.column !== overWidget.column) {
      setEditedWidgets((widgets) => {
        const activeIndex = widgets.findIndex(w => w.id === active.id)
        const overIndex = widgets.findIndex(w => w.id === over.id)

        const updatedWidgets = [...widgets]
        updatedWidgets[activeIndex] = {
          ...updatedWidgets[activeIndex],
          column: overWidget.column,
        }

        const reordered = arrayMove(updatedWidgets, activeIndex, overIndex)

        // Reorder within each column
        const leftWidgets = reordered.filter(w => w.column === 'left')
          .map((w, i) => ({ ...w, order: i }))
        const rightWidgets = reordered.filter(w => w.column === 'right')
          .map((w, i) => ({ ...w, order: i }))

        return [...leftWidgets, ...rightWidgets]
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    setEditedWidgets((widgets) => {
      const activeWidget = widgets.find(w => w.id === active.id)
      const overWidget = widgets.find(w => w.id === over.id)

      if (!activeWidget || !overWidget) return widgets

      const activeIndex = widgets.findIndex(w => w.id === active.id)
      const overIndex = widgets.findIndex(w => w.id === over.id)

      const reordered = arrayMove(widgets, activeIndex, overIndex)

      // Ensure widget is in the correct column and reorder
      const leftWidgets = reordered.filter(w => w.column === 'left')
        .map((w, i) => ({ ...w, order: i }))
      const rightWidgets = reordered.filter(w => w.column === 'right')
        .map((w, i) => ({ ...w, order: i }))

      return [...leftWidgets, ...rightWidgets]
    })
  }

  const handleSave = () => {
    onSave(editedWidgets)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setEditedWidgets(widgets)
    setActiveId(null)
    setIsOpen(false)
  }

  const leftColumnWidgets = editedWidgets.filter(w => w.column === 'left').sort((a, b) => a.order - b.order)
  const rightColumnWidgets = editedWidgets.filter(w => w.column === 'right').sort((a, b) => a.order - b.order)

  const activeWidget = activeId ? editedWidgets.find(w => w.id === activeId) : null

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        대시보드 편집
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 z-50 overflow-auto">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  대시보드 위젯 설정
                </CardTitle>
                <CardDescription>
                  위젯을 드래그하여 순서를 변경하거나 왼쪽/오른쪽 컬럼으로 이동할 수 있습니다.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">왼쪽 컬럼</h3>
                  <SortableContext
                    items={leftColumnWidgets.map(w => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px] p-2 rounded-lg border-2 border-dashed border-muted">
                      {leftColumnWidgets.map((widget) => (
                        <SortableWidgetItem
                          key={widget.id}
                          widget={widget}
                          onToggle={handleToggleVisibility}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">오른쪽 컬럼</h3>
                  <SortableContext
                    items={rightColumnWidgets.map(w => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 min-h-[200px] p-2 rounded-lg border-2 border-dashed border-muted">
                      {rightColumnWidgets.map((widget) => (
                        <SortableWidgetItem
                          key={widget.id}
                          widget={widget}
                          onToggle={handleToggleVisibility}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              </div>

              <DragOverlay>
                {activeWidget ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-lg opacity-80">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-sm font-medium">
                      {activeWidget.title}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Summary */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
              <div className="text-sm">
                <span className="text-muted-foreground">표시 중인 위젯:</span>{" "}
                <span className="font-medium">
                  {editedWidgets.filter(w => w.visible).length} / {editedWidgets.length}
                </span>
              </div>
              <Badge variant="outline">
                {editedWidgets.filter(w => !w.visible).length}개 숨김
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
