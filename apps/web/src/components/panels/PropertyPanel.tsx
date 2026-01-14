import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry } from '@lowcode-lite/core';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings2, Trash2, Copy, Move, Maximize2 } from 'lucide-react';
import type { PropDefinition } from '@lowcode-lite/shared';
import { GRID_COLS, MIN_COMPONENT_WIDTH, MIN_COMPONENT_HEIGHT, calculateRequiredRows } from '@/components/canvas/gridUtils';

interface PropertyPanelProps {
  className?: string;
}

// 属性编辑器
function PropEditor({
  propKey,
  label,
  propDef,
  value,
  onChange,
}: {
  propKey: string;
  label?: string;
  propDef: PropDefinition;
  value: any;
  onChange: (value: any) => void;
}) {
  const displayLabel = label || propKey;
  
  const renderEditor = () => {
    switch (propDef.type) {
      case 'string':
        return (
          <Input
            value={value ?? propDef.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-8"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? propDef.default ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer h-8">
            <input
              type="checkbox"
              checked={value ?? propDef.default ?? false}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">{value ? '启用' : '禁用'}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value ?? propDef.default ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {propDef.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value ?? propDef.default ?? '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer"
            />
            <Input
              value={value ?? propDef.default ?? ''}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 flex-1 font-mono text-xs"
            />
          </div>
        );

      default:
        return (
          <Input
            value={String(value ?? propDef.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="h-8"
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {displayLabel}
      </label>
      {renderEditor()}
    </div>
  );
}

// 位置/尺寸编辑器
function PositionEditor({
  position,
  onChange,
}: {
  position: { x: number; y: number; w: number; h: number };
  onChange: (pos: { x: number; y: number; w: number; h: number }) => void;
}) {
  const appContext = useCoreContext();
  const allComponents = appContext.currentPage?.components ?? [];
  
  // 计算当前画布的行数（动态）
  const currentRows = calculateRequiredRows(allComponents);
  
  // 限制值在有效范围内
  const clampX = (x: number) => Math.max(0, Math.min(x, GRID_COLS - position.w));
  const clampY = (y: number) => Math.max(0, y); // Y 轴不限制最大值，画布会自动拓展
  const clampW = (w: number) => Math.max(MIN_COMPONENT_WIDTH, Math.min(w, GRID_COLS - position.x));
  const clampH = (h: number) => Math.max(MIN_COMPONENT_HEIGHT, h); // 高度不限制最大值

  return (
    <div className="space-y-3">
      {/* 位置 */}
      <div className="flex items-center gap-2">
        <Move className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground w-8">位置</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">X</span>
            <Input
              type="number"
              min={0}
              max={GRID_COLS - position.w}
              value={position.x}
              onChange={(e) => onChange({ ...position, x: clampX(Number(e.target.value)) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Y</span>
            <Input
              type="number"
              min={0}
              value={position.y}
              onChange={(e) => onChange({ ...position, y: clampY(Number(e.target.value)) })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
      
      {/* 尺寸 */}
      <div className="flex items-center gap-2">
        <Maximize2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground w-8">尺寸</span>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">W</span>
            <Input
              type="number"
              min={MIN_COMPONENT_WIDTH}
              max={GRID_COLS - position.x}
              value={position.w}
              onChange={(e) => onChange({ ...position, w: clampW(Number(e.target.value)) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">H</span>
            <Input
              type="number"
              min={MIN_COMPONENT_HEIGHT}
              value={position.h}
              onChange={(e) => onChange({ ...position, h: clampH(Number(e.target.value)) })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
      
      {/* 范围提示 */}
      <p className="text-[10px] text-muted-foreground/60">
        画布范围: {GRID_COLS} 列 × {currentRows} 行（自动拓展）| 最小尺寸: {MIN_COMPONENT_WIDTH}×{MIN_COMPONENT_HEIGHT}
      </p>
    </div>
  );
}

export function PropertyPanel({ className }: PropertyPanelProps) {
  useSignals(); // 启用 signals 自动追踪
  
  const appContext = useCoreContext();
  const editor = useEditor();
  const selectedId = editor.selectedComponentId.value;

  // 获取选中的组件数据（每次渲染都重新获取以响应 signal 变化）
  const page = appContext.currentPage;
  const selectedComponent = selectedId 
    ? page?.components.find((c) => c.id === selectedId) ?? null 
    : null;

  // 获取组件定义
  const definition = selectedComponent 
    ? componentRegistry.get(selectedComponent.type) 
    : null;

  const handlePropChange = (key: string, value: any) => {
    if (!selectedId || !selectedComponent) return;

    appContext.updateComponent(selectedId, {
      props: {
        ...selectedComponent.props,
        [key]: value,
      },
    });
  };

  const handlePositionChange = (position: { x: number; y: number; w: number; h: number }) => {
    if (!selectedId) return;
    appContext.updateComponent(selectedId, { position });
  };

  const handleNameChange = (name: string) => {
    if (!selectedId) return;
    appContext.updateComponent(selectedId, { name });
  };

  const handleDelete = () => {
    if (!selectedId) return;
    appContext.deleteComponent(selectedId);
    editor.selectedComponentId.value = null;
  };

  const handleDuplicate = () => {
    if (!selectedId || !selectedComponent) return;
    
    const newId = `comp_${Date.now()}`;
    const existingNames = appContext.currentPage?.components.map(c => c.name) ?? [];
    let newName = `${selectedComponent.name}_copy`;
    let counter = 1;
    while (existingNames.includes(newName)) {
      newName = `${selectedComponent.name}_copy${counter++}`;
    }

    appContext.addComponent({
      ...selectedComponent,
      id: newId,
      name: newName,
      position: {
        ...selectedComponent.position,
        x: selectedComponent.position.x + 2,
        y: selectedComponent.position.y + 2,
      },
    });

    editor.selectedComponentId.value = newId;
  };

  return (
    <aside className={cn('border-l bg-background flex flex-col', className)}>
      {selectedComponent && definition ? (
        <>
          {/* Header */}
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-sm font-bold">
                    {definition.displayName.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{definition.displayName}</h2>
                  <p className="text-xs text-muted-foreground">{definition.name}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDuplicate}
                  className="h-8 w-8"
                  title="复制组件"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="删除组件"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* 组件名称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">组件名称</label>
              <Input
                value={selectedComponent.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-8 font-mono text-sm"
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* 布局 */}
            <div className="p-4 border-b">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                布局
              </h3>
              <PositionEditor
                position={selectedComponent.position}
                onChange={handlePositionChange}
              />
            </div>

            {/* 属性 */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                属性
              </h3>
              <div className="space-y-4">
                {Object.entries(definition.props).map(([key, propDef]) => {
                  // 跳过事件类型
                  if (propDef.type === 'event') return null;

                  return (
                    <PropEditor
                      key={key}
                      propKey={key}
                      propDef={propDef}
                      value={selectedComponent.props[key]}
                      onChange={(value) => handlePropChange(key, value)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Settings2 className="h-8 w-8 opacity-30" />
          </div>
          <p className="text-sm font-medium">选择组件以编辑属性</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            点击画布上的组件进行选择
          </p>
        </div>
      )}
    </aside>
  );
}
