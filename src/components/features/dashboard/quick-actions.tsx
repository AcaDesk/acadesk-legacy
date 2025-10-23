'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu';
import { Badge } from '@ui/badge';
import { ScrollArea } from '@ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Plus,
  GripVertical,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  UserPlus,
  FileSpreadsheet,
  CalendarPlus,
  NotepadText,
  Clock,
  GraduationCap,
  BarChart3,
  BookPlus,
  MessageSquarePlus,
  Receipt,
  Bell,
  Settings2,
  Zap,
  Sparkles,
  RotateCcw,
  Search,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { createPortal } from 'react-dom';

// 액션 색상 스타일 맵 (Amber Minimal 테마 - 통일성과 컴팩트함 강조)
const ACTION_STYLES = {
  // 기본 스타일 - 모든 액션에 통일된 스타일 적용 (Primary/Amber 톤)
  primary: {
    bg: 'bg-primary/8 dark:bg-primary/12',
    bgHover: 'group-hover:bg-primary/15 dark:group-hover:bg-primary/20',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  // 중요 액션 강조 - 학생 등록 (Blue 톤으로 눈에 띄게)
  accent: {
    bg: 'bg-primary/8 dark:bg-primary/12',
    bgHover: 'group-hover:bg-primary/15 dark:group-hover:bg-primary/20',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  // 재무 관련 강조 - 수납 기록 (통일된 톤 사용)
  success: {
    bg: 'bg-primary/8 dark:bg-primary/12',
    bgHover: 'group-hover:bg-primary/15 dark:group-hover:bg-primary/20',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
  // 중립 스타일
  muted: {
    bg: 'bg-primary/8 dark:bg-primary/12',
    bgHover: 'group-hover:bg-primary/15 dark:group-hover:bg-primary/20',
    text: 'text-primary',
    ring: 'ring-primary/20',
  },
} as const;

type ActionColor = keyof typeof ACTION_STYLES;

// 사용 가능한 모든 액션 정의 (색상 통일 - Primary 베이스 + 중요 기능만 강조)
const AVAILABLE_ACTIONS = [
  {
    id: 'new-student',
    label: '학생 등록',
    icon: UserPlus,
    href: '/students',
    color: 'accent' as ActionColor, // 강조 - 가장 중요한 기능
    category: '학생 관리',
  },
  {
    id: 'new-report',
    label: '리포트 생성',
    icon: FileSpreadsheet,
    href: '/reports/new',
    color: 'primary' as ActionColor,
    category: '리포트',
  },
  {
    id: 'new-consultation',
    label: '상담 일정 추가',
    icon: CalendarPlus,
    href: '/consultations/new',
    color: 'primary' as ActionColor,
    category: '상담',
  },
  {
    id: 'new-todo',
    label: 'TODO 추가',
    icon: NotepadText,
    href: '/todos/new',
    color: 'primary' as ActionColor,
    category: 'TODO',
  },
  {
    id: 'attendance-check',
    label: '출석 체크',
    icon: Clock,
    href: '/attendance',
    color: 'primary' as ActionColor,
    category: '출석',
  },
  {
    id: 'new-class',
    label: '수업 생성',
    icon: GraduationCap,
    href: '/classes/new',
    color: 'primary' as ActionColor,
    category: '수업',
  },
  {
    id: 'exam-entry',
    label: '시험 점수 입력',
    icon: BarChart3,
    href: '/grades/exams',
    color: 'primary' as ActionColor,
    category: '성적',
  },
  {
    id: 'library-lending',
    label: '도서 대여',
    icon: BookPlus,
    href: '/library/lendings',
    color: 'primary' as ActionColor,
    category: '도서관',
  },
  {
    id: 'send-message',
    label: '메시지 전송',
    icon: MessageSquarePlus,
    href: '/messages/new',
    color: 'primary' as ActionColor,
    category: '소통',
  },
  {
    id: 'payment-record',
    label: '수납 기록',
    icon: Receipt,
    href: '/payments/new',
    color: 'success' as ActionColor, // 강조 - 재무 관련 중요 기능
    category: '재무',
  },
  {
    id: 'notifications',
    label: '알림 센터',
    icon: Bell,
    href: '/notifications',
    color: 'primary' as ActionColor,
    category: '알림',
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings2,
    href: '/settings',
    color: 'muted' as ActionColor,
    category: '시스템',
  },
];

// 기본 액션 (처음 표시될 액션들)
const DEFAULT_QUICK_ACTIONS = [
  'new-student',
  'new-report',
  'attendance-check',
  'new-todo',
];

// 추천 메뉴 프리셋
const PRESET_ACTIONS = {
  default: {
    name: '기본 설정',
    description: '가장 많이 사용하는 기본 메뉴 조합',
    actions: ['new-student', 'new-report', 'attendance-check', 'new-todo'],
  },
  director: {
    name: '원장님 추천',
    description: '경영과 관리에 초점을 맞춘 메뉴 조합',
    actions: ['payment-record', 'new-report', 'new-consultation', 'send-message', 'notifications', 'exam-entry'],
  },
  instructor: {
    name: '강사용 추천',
    description: '수업과 학생 관리에 초점을 맞춘 메뉴 조합',
    actions: ['attendance-check', 'new-todo', 'exam-entry', 'new-class', 'library-lending', 'send-message'],
  },
} as const;

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  color: ActionColor;
  category: string;
}

interface SortableActionItemProps {
  action: QuickAction;
  onRemove: () => void;
}

function SortableActionItem({ action, onRemove }: SortableActionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = action.icon;
  const colorStyle = ACTION_STYLES[action.color];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50"
      )}
    >
      <div className="relative group">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all",
          "bg-card hover:bg-accent/50",
          "border-border hover:border-primary/30",
          "animate-in fade-in-50 slide-in-from-left-2 duration-300"
        )}>
          <button
            className={cn(
              "cursor-grab active:cursor-grabbing touch-none",
              "hover:text-primary transition-colors"
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className={cn("p-2 rounded-md", colorStyle.bg)}>
            <Icon className={cn("h-4 w-4", colorStyle.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground block truncate">
              {action.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {action.category}
            </span>
          </div>
          <button
            onClick={onRemove}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-all",
              "hover:text-destructive hover:scale-110",
              "p-1 rounded-md hover:bg-destructive/10"
            )}
            title="제거"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DragOverlayItemProps {
  action: QuickAction;
}

function DragOverlayItem({ action }: DragOverlayItemProps) {
  const Icon = action.icon;
  const colorStyle = ACTION_STYLES[action.color];

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-all",
      "bg-card shadow-2xl opacity-90",
      "border-primary ring-2 ring-primary/30",
      "rotate-2 scale-105"
    )}>
      <GripVertical className="h-4 w-4 text-primary" />
      <div className={cn("p-2 rounded-md", colorStyle.bg)}>
        <Icon className={cn("h-4 w-4", colorStyle.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block truncate">
          {action.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {action.category}
        </span>
      </div>
    </div>
  );
}

interface ActionItemProps {
  action: QuickAction;
  onClick: () => void;
}

function ActionItem({ action, onClick }: ActionItemProps) {
  const Icon = action.icon;
  const colorStyle = ACTION_STYLES[action.color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all text-left w-full",
        "bg-card hover:bg-accent/50",
        "border-border hover:border-primary/30",
        "hover:shadow-sm hover:scale-[1.02]",
        "group"
      )}
    >
      <div className={cn("p-2 rounded-md", colorStyle.bg)}>
        <Icon className={cn("h-4 w-4", colorStyle.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground block truncate">
          {action.label}
        </span>
        <span className="text-xs text-muted-foreground">
          {action.category}
        </span>
      </div>
      <Plus className={cn(
        "h-4 w-4 text-muted-foreground transition-all",
        "group-hover:text-primary group-hover:scale-110"
      )} />
    </button>
  );
}

interface QuickActionsProps {
  isEditMode?: boolean;
}

export function QuickActions({ isEditMode = false }: QuickActionsProps) {
  // 로컬 스토리지에서 개인화된 액션 불러오기
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quickActions');
      return saved ? JSON.parse(saved) : DEFAULT_QUICK_ACTIONS;
    }
    return DEFAULT_QUICK_ACTIONS;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // 임시 상태 (다이얼로그 내에서만 사용)
  const [tempSelectedActionIds, setTempSelectedActionIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 다이얼로그 열기 시 임시 상태 초기화
  const handleOpenDialog = () => {
    setTempSelectedActionIds([...selectedActionIds]);
    setSearchQuery('');
    setDialogOpen(true);
  };

  // 선택된 액션 객체들 (다이얼로그가 열려있으면 임시 상태 사용)
  const activeActionIds = dialogOpen ? tempSelectedActionIds : selectedActionIds;
  const selectedActions = activeActionIds
    .map(id => AVAILABLE_ACTIONS.find(a => a.id === id))
    .filter(Boolean) as QuickAction[];

  // 선택되지 않은 액션들 (검색 필터 적용)
  const availableActions = AVAILABLE_ACTIONS.filter(
    a => !activeActionIds.includes(a.id)
  );

  // 검색 필터링
  const filteredAvailableActions = useMemo(() => {
    if (!searchQuery.trim()) return availableActions;

    const query = searchQuery.toLowerCase();
    return availableActions.filter(
      action =>
        action.label.toLowerCase().includes(query) ||
        action.category.toLowerCase().includes(query)
    );
  }, [availableActions, searchQuery]);

  // 카테고리별로 그룹화
  const availableActionsByCategory = filteredAvailableActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setTempSelectedActionIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleAddAction = (actionId: string) => {
    setTempSelectedActionIds(prev => [...prev, actionId]);
  };

  const handleRemoveAction = (actionId: string) => {
    setTempSelectedActionIds(prev => prev.filter(id => id !== actionId));
  };

  const handleReset = () => {
    setTempSelectedActionIds([...DEFAULT_QUICK_ACTIONS]);
  };

  const handleApplyPreset = (presetKey: keyof typeof PRESET_ACTIONS) => {
    const preset = PRESET_ACTIONS[presetKey];
    setTempSelectedActionIds([...preset.actions]);
  };

  const handleSave = () => {
    setSelectedActionIds(tempSelectedActionIds);
    localStorage.setItem('quickActions', JSON.stringify(tempSelectedActionIds));
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedActionIds([...selectedActionIds]);
    setSearchQuery('');
    setDialogOpen(false);
  };

  // 변경사항이 있는지 확인
  const hasChanges = useMemo(() => {
    if (tempSelectedActionIds.length !== selectedActionIds.length) return true;
    return !tempSelectedActionIds.every((id, index) => id === selectedActionIds[index]);
  }, [tempSelectedActionIds, selectedActionIds]);

  return (
    <Card className={cn(
      "h-full transition-all duration-300",
      isEditMode && "ring-2 ring-primary/30 shadow-lg"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold">빠른 실행</CardTitle>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenDialog}
              className={cn(
                "h-8 w-8 p-0",
                "hover:bg-accent hover:text-foreground",
                "transition-all duration-200"
              )}
              title="빠른 실행 메뉴 설정"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col"
            onEscapeKeyDown={handleCancel}
            onPointerDownOutside={handleCancel}
          >
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">빠른 실행 메뉴 설정</DialogTitle>
                    <DialogDescription className="text-sm mt-0.5">
                      자주 사용하는 기능을 선택하세요
                    </DialogDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {tempSelectedActionIds.length}개 선택됨
                </Badge>
              </div>
            </DialogHeader>

            {/* Search Bar */}
            <div className="px-6 py-4 bg-muted/30 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="메뉴 검색... (예: 학생, 출석, 성적)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-background"
                />
              </div>
            </div>

            {/* Content - Single Column Layout */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Selected Actions Section */}
                {tempSelectedActionIds.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        선택된 메뉴
                      </h3>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={tempSelectedActionIds}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="grid gap-2">
                          {selectedActions.map((action) => (
                            <SortableActionItem
                              key={action.id}
                              action={action}
                              onRemove={() => handleRemoveAction(action.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <DragOverlayItem
                            action={selectedActions.find(a => a.id === activeId)!}
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )}

                {/* Available Actions Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">
                      {searchQuery ? '검색 결과' : '추가 가능한 메뉴'}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    {!searchQuery && (
                      <span className="text-xs text-muted-foreground">
                        {AVAILABLE_ACTIONS.length - tempSelectedActionIds.length}개
                      </span>
                    )}
                  </div>

                  {Object.keys(availableActionsByCategory).length > 0 ? (
                    <div className="grid gap-6">
                      {Object.entries(availableActionsByCategory).map(([category, actions]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2 px-2">
                            <div className="h-px flex-1 bg-border" />
                            <h4 className="text-xs font-medium text-muted-foreground">
                              {category}
                            </h4>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <div className="grid gap-2">
                            {actions.map((action) => (
                              <ActionItem
                                key={action.id}
                                action={action}
                                onClick={() => handleAddAction(action.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-lg bg-muted/20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
                        {searchQuery ? (
                          <Search className="h-7 w-7 text-muted-foreground/50" />
                        ) : (
                          <Check className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {searchQuery
                          ? '검색 결과가 없습니다'
                          : '모든 메뉴가 선택되었습니다'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery
                          ? '다른 검색어를 시도해보세요'
                          : '선택된 메뉴에서 제거하여 다시 추가할 수 있습니다'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Lightbulb className="h-4 w-4" />
                      추천 메뉴
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>추천 메뉴 불러오기</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(PRESET_ACTIONS).map(([key, preset]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleApplyPreset(key as keyof typeof PRESET_ACTIONS)}
                        className="flex-col items-start gap-1 py-2.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Sparkles className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium">{preset.name}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {preset.actions.length}개
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          {preset.description}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                  title="기본 설정으로 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                  초기화
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="pt-0">
        {selectedActions.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {selectedActions.slice(0, isEditMode ? selectedActions.length : 8).map((action, index) => {
              const Icon = action.icon;
              const colorStyle = ACTION_STYLES[action.color];
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-lg transition-all duration-200",
                    "hover:bg-accent/50 hover:scale-[1.02]",
                    "group cursor-pointer border border-transparent",
                    "hover:border-border hover:shadow-sm",
                    "animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={cn(
                    "p-2 rounded-md transition-all duration-200 shrink-0",
                    colorStyle.bg,
                    colorStyle.bgHover
                  )}>
                    <Icon className={cn("h-4 w-4", colorStyle.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {action.label}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 text-muted-foreground transition-all duration-200 shrink-0",
                    "group-hover:text-foreground group-hover:translate-x-0.5"
                  )} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-dashed bg-muted/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              빠른 실행 메뉴가 비어있습니다
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              자주 사용하는 기능을 추가해보세요
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDialog}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              메뉴 추가
            </Button>
          </div>
        )}

        {/* 더 많은 액션이 있을 경우 표시 */}
        {!isEditMode && selectedActions.length > 8 && (
          <button
            onClick={handleOpenDialog}
            className={cn(
              "w-full mt-2 p-2 rounded-lg transition-all",
              "bg-muted/50 hover:bg-accent",
              "border border-dashed border-border hover:border-primary/30",
              "text-xs text-muted-foreground hover:text-foreground",
              "font-medium flex items-center justify-center gap-2"
            )}
          >
            <Plus className="h-3 w-3" />
            <span>{selectedActions.length - 8}개 더 보기</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
