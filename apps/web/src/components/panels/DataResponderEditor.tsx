import { useState } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Zap,
  Play,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import type { DataResponderDefinition } from '@lowcode-lite/shared';

interface DataResponderEditorProps {
  className?: string;
}

// DataResponder 列表项
function DataResponderListItem({
  responder,
  isSelected,
  onSelect,
  onDelete,
}: {
  responder: DataResponderDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const appContext = useCoreContext();
  const instance = appContext.dataResponderManager.getResponder(responder.id);
  const state = instance?.state ?? 'idle';

  const getStateIcon = () => {
    switch (state) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors group',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-muted/50 text-foreground',
        !responder.enabled && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate flex-1">{responder.name}</span>
      {getStateIcon()}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        title="删除响应器"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// 监听表达式列表编辑器
function WatchExpressionEditor({
  expressions,
  onChange,
}: {
  expressions: string[];
  onChange: (expressions: string[]) => void;
}) {
  const [newExpr, setNewExpr] = useState('');

  const handleAdd = () => {
    if (newExpr.trim()) {
      onChange([...expressions, newExpr.trim()]);
      setNewExpr('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(expressions.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      {expressions.map((expr, index) => (
        <div
          key={index}
          className="flex items-center gap-2 bg-muted/30 rounded-md px-2 py-1"
        >
          <code className="text-xs font-mono flex-1 truncate">{expr}</code>
          <button
            onClick={() => handleRemove(index)}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="移除"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newExpr}
          onChange={(e) => setNewExpr(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入表达式，如 input1.value"
          className="h-7 text-xs font-mono flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!newExpr.trim()}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// DataResponder 详情编辑器
function DataResponderDetailEditor({
  responder,
  onUpdate,
}: {
  responder: DataResponderDefinition;
  onUpdate: (updates: Partial<DataResponderDefinition>) => void;
}) {
  useSignals();

  const appContext = useCoreContext();
  const instance = appContext.dataResponderManager.getResponder(responder.id);
  const [copied, setCopied] = useState(false);

  const state = instance?.state ?? 'idle';
  const error = instance?.error;
  const lastRunTime = instance?.lastRunTime;
  const runCount = instance?.runCount ?? 0;

  const handleTrigger = () => {
    instance?.trigger();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(responder.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 名称和触发按钮 */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={responder.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 font-mono text-sm flex-1"
            placeholder="响应器名称"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleTrigger}
            className="h-8"
            title="手动触发"
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 启用状态 */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={responder.enabled}
              onChange={(e) => onUpdate({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">启用</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={responder.runOnInit}
              onChange={(e) => onUpdate({ runOnInit: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">初始化时执行</span>
          </label>
        </div>

        {/* 描述 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            描述
          </label>
          <Input
            value={responder.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="响应器描述（可选）"
            className="h-8 text-xs"
          />
        </div>

        {/* 监听表达式 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            监听的表达式
          </label>
          <WatchExpressionEditor
            expressions={responder.watch}
            onChange={(watch) => onUpdate({ watch })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            当这些表达式的值变化时，将触发执行
          </p>
        </div>

        {/* 防抖时间 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            防抖时间 (ms)
          </label>
          <Input
            type="number"
            value={responder.debounceMs}
            onChange={(e) => onUpdate({ debounceMs: Number(e.target.value) })}
            placeholder="0 表示不防抖"
            className="h-8 text-xs w-32"
          />
        </div>

        {/* 代码编辑器 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">
              响应代码
            </label>
            <button
              onClick={handleCopy}
              className={cn(
                'p-1 rounded transition-colors',
                copied
                  ? 'text-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="复制代码"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          <textarea
            value={responder.code}
            onChange={(e) => onUpdate({ code: e.target.value })}
            placeholder="// 当监听的数据变化时执行
// 可以访问所有组件、查询和状态
// 例如:
// state1.setValue(input1.value);
// query1.run();

console.log('数据已变化');"
            className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* 执行状态 */}
        <div className="bg-muted/30 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              执行状态
            </span>
            <div className="flex items-center gap-2">
              {state === 'running' && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
              {state === 'success' && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
              {state === 'error' && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                执行 {runCount} 次
                {lastRunTime !== undefined && ` · ${lastRunTime}ms`}
              </span>
            </div>
          </div>
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md font-mono">
              {error}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-muted/30 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            使用方法
          </p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {responder.name}.trigger()
              </code>
              <span className="text-xs text-muted-foreground">手动触发执行</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {responder.name}.setEnabled(true/false)
              </code>
              <span className="text-xs text-muted-foreground">启用/禁用</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {responder.name}.runCount
              </code>
              <span className="text-xs text-muted-foreground">执行次数</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function DataResponderEditor({ className }: DataResponderEditorProps) {
  useSignals();

  const appContext = useCoreContext();
  const [selectedResponderId, setSelectedResponderId] = useState<string | null>(
    null
  );

  // 获取所有数据响应器 - 直接访问 signal.value 以触发响应式更新
  const dataResponders = appContext.dataRespondersSignal.value;

  // 选中的响应器
  const selectedResponder = selectedResponderId
    ? dataResponders.find((r) => r.id === selectedResponderId) ?? null
    : null;

  const handleCreateResponder = () => {
    const responder = appContext.createDataResponder();
    setSelectedResponderId(responder.id);
  };

  const handleDeleteResponder = (id: string) => {
    appContext.deleteDataResponder(id);
    if (selectedResponderId === id) {
      setSelectedResponderId(null);
    }
  };

  const handleUpdateResponder = (
    updates: Partial<DataResponderDefinition>
  ) => {
    if (!selectedResponderId) return;
    appContext.updateDataResponder(selectedResponderId, updates);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* 左侧列表 */}
      <div className="w-48 border-r flex flex-col bg-background/50">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            响应器列表
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateResponder}
            className="h-6 w-6"
            title="新建响应器"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {dataResponders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">暂无响应器</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateResponder}
                className="mt-2 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                新建响应器
              </Button>
            </div>
          ) : (
            dataResponders.map((responder) => (
              <DataResponderListItem
                key={responder.id}
                responder={responder}
                isSelected={selectedResponderId === responder.id}
                onSelect={() => setSelectedResponderId(responder.id)}
                onDelete={() => handleDeleteResponder(responder.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器 */}
      <div className="flex-1 flex flex-col">
        {selectedResponder ? (
          <DataResponderDetailEditor
            responder={selectedResponder}
            onUpdate={handleUpdateResponder}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">选择或创建响应器</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              响应器用于监听数据变化并执行操作
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
