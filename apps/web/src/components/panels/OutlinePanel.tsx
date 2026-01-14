import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry } from '@lowcode-lite/core';
import type { ComponentData } from '@lowcode-lite/shared';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  Square,
  Type,
  Image,
  Layout,
  MousePointer,
  FileText,
  GripVertical,
  List,
  CheckSquare,
  ToggleLeft,
  AlignLeft,
  CircleDot,
  Table,
  Loader,
  Tag,
  Minus,
  Maximize2,
} from 'lucide-react';
import { useState } from 'react';
import { DataSummary } from './DataPanel';

interface OutlinePanelProps {
  className?: string;
}

// 组件类型对应的图标
const componentIcons: Record<string, React.ElementType> = {
  button: MousePointer,
  text: Type,
  input: Square,
  image: Image,
  container: Layout,
  form: FileText,
  modal: Maximize2,
  select: List,
  checkbox: CheckSquare,
  switch: ToggleLeft,
  textarea: AlignLeft,
  radio: CircleDot,
  table: Table,
  progress: Loader,
  badge: Tag,
  divider: Minus,
};

// 获取组件图标
function getComponentIcon(type: string): React.ElementType {
  return componentIcons[type] || FileText;
}

// 单个大纲项
interface OutlineItemProps {
  component: ComponentData;
  depth?: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isSelected: boolean;
}

function OutlineItem({
  component,
  depth = 0,
  onSelect,
  onDelete,
  onDuplicate,
  isSelected,
}: OutlineItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = component.children && component.children.length > 0;
  const Icon = getComponentIcon(component.type);
  
  // 获取组件定义
  const definition = componentRegistry.get(component.type);
  const displayName = definition?.name || component.type;

  return (
    <div>
      {/* 当前项 */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group transition-colors',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(component.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded hover:bg-black/10"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* 拖拽手柄 */}
        <GripVertical className={cn(
          'h-3 w-3 cursor-grab opacity-0 group-hover:opacity-50 transition-opacity',
          isSelected && 'opacity-50'
        )} />

        {/* 组件图标 */}
        <Icon className={cn(
          'h-4 w-4 flex-shrink-0',
          isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
        )} />

        {/* 组件名称 */}
        <span className="flex-1 text-sm truncate">{component.name}</span>

        {/* 数据摘要预览 */}
        {!isSelected && (
          <DataSummary 
            componentName={component.name}
            componentType={component.type}
            componentProps={component.props}
            className="opacity-70"
          />
        )}

        {/* 组件类型标签 */}
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded',
          isSelected
            ? 'bg-white/20 text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}>
          {displayName}
        </span>

        {/* 操作按钮 */}
        {(isHovered || isSelected) && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(component.id);
              }}
              className={cn(
                'p-1 rounded hover:bg-black/10 transition-colors',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
              title="复制组件"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(component.id);
              }}
              className={cn(
                'p-1 rounded hover:bg-red-500 hover:text-white transition-colors',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
              title="删除组件"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* 子组件 */}
      {hasChildren && isExpanded && (
        <div>
          {component.children!.map((child) => (
            <OutlineItem
              key={child.id}
              component={child}
              depth={depth + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              isSelected={isSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlinePanel({ className }: OutlinePanelProps) {
  useSignals();

  const appContext = useCoreContext();
  const editor = useEditor();
  const selectedId = editor.selectedComponentId.value;
  
  const currentPage = appContext.currentPage;
  const components = currentPage?.components ?? [];

  const handleSelect = (id: string) => {
    editor.selectedComponentId.value = id;
  };

  const handleDelete = (id: string) => {
    appContext.deleteComponent(id);
    if (selectedId === id) {
      editor.selectedComponentId.value = null;
    }
  };

  const handleDuplicate = (id: string) => {
    const component = components.find((c) => c.id === id);
    if (!component) return;

    const definition = componentRegistry.get(component.type);
    const defaultSize = definition?.defaultSize ?? { w: 4, h: 4 };

    // 生成新名称
    const existingNames = components.map((c) => c.name);
    let newName = `${component.name}_copy`;
    let counter = 1;
    while (existingNames.includes(newName)) {
      newName = `${component.name}_copy${counter}`;
      counter++;
    }

    // 创建新组件（位置偏移）
    const newId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    appContext.addComponent({
      id: newId,
      type: component.type,
      name: newName,
      props: { ...component.props },
      position: {
        x: Math.min(component.position.x + 1, 23),
        y: component.position.y + 1,
        w: component.position.w,
        h: component.position.h,
      },
    });

    editor.selectedComponentId.value = newId;
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 页面信息 */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{currentPage?.name || '页面'}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {components.length} 个组件
        </span>
      </div>

      {/* 组件列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Layout className="h-10 w-10 opacity-30 mb-2" />
            <p className="text-sm">暂无组件</p>
            <p className="text-xs opacity-70">拖拽组件到画布开始搭建</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {components.map((component) => (
              <OutlineItem
                key={component.id}
                component={component}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                isSelected={selectedId === component.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
