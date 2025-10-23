'use client';

import { useState, useMemo } from 'react';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Separator } from '@ui/separator';
import { Input } from '@ui/input';
import { RefreshCw, Save, X, Plus, Search, Settings2, Layout, LayoutGrid, LayoutList, Focus, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/dialog';
import { ScrollArea } from '@ui/scroll-area';
import { cn } from '@/lib/utils';
import { pageHeader } from '@/lib/design-system';
import { LAYOUT_PRESETS, type DashboardPreset } from '@/core/types/dashboard';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  hiddenWidgets?: Array<{ id: string; name: string }>;
  onAddWidget?: (id: string) => void;
  onApplyPreset?: (preset: DashboardPreset) => void;
  isLoading?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  className?: string;
}

export function DashboardHeader({
  title,
  description,
  isEditMode,
  onToggleEditMode,
  onSave,
  onCancel,
  onRefresh,
  hiddenWidgets = [],
  onAddWidget,
  onApplyPreset,
  isLoading = false,
  isSaving = false,
  hasChanges = false,
  className,
}: DashboardHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter hidden widgets based on search query
  const filteredHiddenWidgets = useMemo(() => {
    if (!searchQuery.trim()) return hiddenWidgets;
    const query = searchQuery.toLowerCase();
    return hiddenWidgets.filter(widget =>
      widget.name.toLowerCase().includes(query)
    );
  }, [hiddenWidgets, searchQuery]);

  const handleAddWidget = (widgetId: string) => {
    onAddWidget?.(widgetId);
    setSearchQuery('');
  };

  const handleOpenDialog = () => {
    setSearchQuery('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSearchQuery('');
    setDialogOpen(false);
  };

  return (
    <header
      className={cn(
        pageHeader.container,
        isEditMode && "bg-accent/50 border-primary/20 transition-all duration-300",
        className
      )}
      role="banner"
      aria-label="대시보드 헤더"
    >
      <div className={pageHeader.content}>
        <div className="flex items-center gap-3">
          <h1 className={pageHeader.title} id="dashboard-title">{title}</h1>
          {hasChanges && (
            <Badge
              variant="secondary"
              className="animate-in fade-in slide-in-from-left-1 duration-300 gap-1"
              role="status"
              aria-live="polite"
              aria-label="저장되지 않은 변경사항이 있습니다"
            >
              <Save className="h-3 w-3" aria-hidden="true" />
              저장되지 않은 변경사항
            </Badge>
          )}
        </div>
        {description && (
          <p className={pageHeader.description} id="dashboard-description">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditMode ? (
          // 편집 모드 컨트롤
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1 duration-300">
            {/* 레이아웃 프리셋 선택 */}
            {onApplyPreset && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Layout className="h-4 w-4" />
                    <span className="hidden sm:inline">레이아웃 프리셋</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    프리셋 레이아웃 선택
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(LAYOUT_PRESETS) as DashboardPreset[]).map((presetKey) => {
                    const preset = LAYOUT_PRESETS[presetKey];
                    const presetIcons: Record<DashboardPreset, typeof LayoutGrid> = {
                      default: LayoutGrid,
                      compact: LayoutList,
                      focus: Focus,
                      overview: Eye,
                    };
                    const Icon = presetIcons[presetKey];

                    return (
                      <DropdownMenuItem
                        key={presetKey}
                        onClick={() => onApplyPreset(presetKey)}
                        className="flex items-start gap-3 py-3 px-3 cursor-pointer hover:bg-accent/80 transition-colors"
                      >
                        <div className="mt-0.5 p-2 rounded-md bg-primary/10 text-primary shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <div className="font-semibold text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {preset.description}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {hiddenWidgets.length > 0 && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenDialog}>
                    <Plus className="h-4 w-4" />
                    <span>위젯 추가</span>
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                      {hiddenWidgets.length}
                    </Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>위젯 추가</DialogTitle>
                    <DialogDescription>
                      대시보드에 표시할 위젯을 선택하세요
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {hiddenWidgets.length > 3 && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="위젯 검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                    )}

                    <ScrollArea className="max-h-[400px] pr-4">
                      {filteredHiddenWidgets.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          {searchQuery ? '검색 결과가 없습니다' : '숨겨진 위젯이 없습니다'}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredHiddenWidgets.map((widget) => (
                            <Button
                              key={widget.id}
                              variant="outline"
                              className="w-full justify-start gap-2 h-auto py-3"
                              onClick={() => {
                                handleAddWidget(widget.id);
                                handleCloseDialog();
                              }}
                            >
                              <Plus className="h-4 w-4 shrink-0" />
                              <span className="text-left">{widget.name}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={handleCloseDialog}>
                      닫기
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {hiddenWidgets.length > 0 && (
              <Separator orientation="vertical" className="h-6" />
            )}

            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              <span>취소</span>
            </Button>

            <Button
              onClick={onSave}
              size="sm"
              disabled={isSaving || !hasChanges}
              className="gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </Button>
          </div>
        ) : (
          // 보기 모드 컨트롤
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span>새로고침</span>
              </Button>
            )}
            <Button
              onClick={onToggleEditMode}
              variant="default"
              size="sm"
              className="gap-2"
            >
              <Settings2 className="h-4 w-4" />
              <span>대시보드 설정</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}