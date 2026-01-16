import { useState, useEffect } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Database,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import type { TempStateDefinition } from '@lowcode-lite/shared';

interface TempStateEditorProps {
  className?: string;
}

// TempState 列表项
function TempStateListItem({
  state,
  isSelected,
  onSelect,
  onDelete,
}: {
  state: TempStateDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors group',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted/50 text-foreground'
      )}
      onClick={onSelect}
    >
      <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate flex-1">{state.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        title="删除状态"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// JSON 值编辑器
function JsonValueEditor({
  value,
  onChange,
  placeholder = '输入 JSON 值...',
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => 
    value === undefined || value === null ? '' : JSON.stringify(value, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value === undefined || value === null ? '' : JSON.stringify(value, null, 2));
  }, [value]);

  const handleBlur = () => {
    if (!text.trim()) {
      onChange(null);
      setError(null);
      return;
    }
    
    try {
      const parsed = JSON.parse(text);
      onChange(parsed);
      setError(null);
    } catch {
      setError('无效的 JSON 格式');
    }
  };

  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          'w-full h-32 rounded-md border bg-background px-3 py-2 text-xs font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none',
          error ? 'border-destructive' : 'border-input'
        )}
      />
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// TempState 详情编辑器
function TempStateDetailEditor({
  state,
  onUpdate,
}: {
  state: TempStateDefinition;
  onUpdate: (updates: Partial<TempStateDefinition>) => void;
}) {
  useSignals();
  
  const appContext = useCoreContext();
  const stateInstance = appContext.tempStateManager.getState(state.id);
  const currentValue = stateInstance?.value;
  const [copied, setCopied] = useState(false);

  const handleReset = () => {
    stateInstance?.reset();
  };

  const handleSetValue = (value: unknown) => {
    stateInstance?.setValue(value);
  };

  const handleCopy = () => {
    const textToCopy = typeof currentValue === 'object' 
      ? JSON.stringify(currentValue, null, 2) 
      : String(currentValue ?? '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 名称 */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={state.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 font-mono text-sm flex-1"
            placeholder="状态名称"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8"
            title="重置为初始值"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 描述 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            描述
          </label>
          <Input
            value={state.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="状态描述（可选）"
            className="h-8 text-xs"
          />
        </div>

        {/* 初始值 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            初始值
          </label>
          <JsonValueEditor
            value={state.initialValue}
            onChange={(value) => onUpdate({ initialValue: value })}
            placeholder='输入初始值（JSON 格式），例如：null, "text", 123, [], {}'
          />
        </div>

        {/* 当前值 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">
              当前值
            </label>
            <button
              onClick={handleCopy}
              className={cn(
                'p-1 rounded transition-colors',
                copied ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'
              )}
              title="复制当前值"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <JsonValueEditor
            value={currentValue}
            onChange={handleSetValue}
            placeholder="当前运行时值"
          />
        </div>

        {/* 使用说明 */}
        <div className="bg-muted/30 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">使用方法</p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {state.name}.value
              </code>
              <span className="text-xs text-muted-foreground">读取当前值</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {state.name}.setValue(newValue)
              </code>
              <span className="text-xs text-muted-foreground">设置新值</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {state.name}.reset()
              </code>
              <span className="text-xs text-muted-foreground">重置为初始值</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function TempStateEditor({ className }: TempStateEditorProps) {
  useSignals();

  const appContext = useCoreContext();
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  // 获取所有临时状态 - 直接访问 signal.value 以触发响应式更新
  const tempStates = appContext.tempStatesSignal.value;
  
  // 选中的状态
  const selectedState = selectedStateId 
    ? tempStates.find((s) => s.id === selectedStateId) ?? null
    : null;

  const handleCreateState = () => {
    const state = appContext.createTempState();
    setSelectedStateId(state.id);
  };

  const handleDeleteState = (id: string) => {
    appContext.deleteTempState(id);
    if (selectedStateId === id) {
      setSelectedStateId(null);
    }
  };

  const handleUpdateState = (updates: Partial<TempStateDefinition>) => {
    if (!selectedStateId) return;
    appContext.updateTempState(selectedStateId, updates);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* 左侧列表 */}
      <div className="w-48 border-r flex flex-col bg-background/50">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">状态列表</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateState}
            className="h-6 w-6"
            title="新建状态"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {tempStates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Database className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">暂无状态</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateState}
                className="mt-2 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                新建状态
              </Button>
            </div>
          ) : (
            tempStates.map((state) => (
              <TempStateListItem
                key={state.id}
                state={state}
                isSelected={selectedStateId === state.id}
                onSelect={() => setSelectedStateId(state.id)}
                onDelete={() => handleDeleteState(state.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器 */}
      <div className="flex-1 flex flex-col">
        {selectedState ? (
          <TempStateDetailEditor
            state={selectedState}
            onUpdate={handleUpdateState}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Database className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">选择或创建状态</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              临时状态用于存储运行时数据
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
