import { useState, useEffect } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Code2,
  Play,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { TransformerDefinition } from '@lowcode-lite/shared';

interface TransformerEditorProps {
  className?: string;
}

// Transformer 列表项
function TransformerListItem({
  transformer,
  isSelected,
  onSelect,
  onDelete,
}: {
  transformer: TransformerDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const appContext = useCoreContext();
  const instance = appContext.transformerManager.getTransformer(transformer.id);
  const state = instance?.state ?? 'idle';

  const getStateIcon = () => {
    switch (state) {
      case 'computing':
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
        !transformer.enabled && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <Code2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate flex-1">{transformer.name}</span>
      {getStateIcon()}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        title="删除转换器"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// Transformer 详情编辑器
function TransformerDetailEditor({
  transformer,
  onUpdate,
}: {
  transformer: TransformerDefinition;
  onUpdate: (updates: Partial<TransformerDefinition>) => void;
}) {
  useSignals();

  const appContext = useCoreContext();
  const instance = appContext.transformerManager.getTransformer(transformer.id);
  const [copied, setCopied] = useState(false);

  const currentValue = instance?.value;
  const state = instance?.state ?? 'idle';
  const error = instance?.error;
  const lastComputeTime = instance?.lastComputeTime;

  const handleRefresh = () => {
    instance?.refresh();
  };

  const handleCopy = () => {
    const textToCopy =
      typeof currentValue === 'object'
        ? JSON.stringify(currentValue, null, 2)
        : String(currentValue ?? '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - 名称和刷新按钮 */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={transformer.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 font-mono text-sm flex-1"
            placeholder="转换器名称"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
            title="刷新"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 启用状态 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="transformer-enabled"
            checked={transformer.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="transformer-enabled" className="text-sm cursor-pointer">
            启用
          </label>
        </div>

        {/* 描述 */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            描述
          </label>
          <Input
            value={transformer.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="转换器描述（可选）"
            className="h-8 text-xs"
          />
        </div>

        {/* 代码编辑器 */}
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            转换代码
          </label>
          <textarea
            value={transformer.code}
            onChange={(e) => onUpdate({ code: e.target.value })}
            placeholder="// 编写 JavaScript 代码
// 可以访问其他组件和查询的数据
// 例如: return query1.data.map(item => item.name);

return null;"
            className="w-full h-48 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* 计算结果 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                计算结果
              </label>
              {state === 'computing' && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
              {state === 'success' && (
                <span className="text-xs text-green-600">
                  {lastComputeTime !== undefined && `${lastComputeTime}ms`}
                </span>
              )}
              {state === 'error' && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                'p-1 rounded transition-colors',
                copied
                  ? 'text-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="复制结果"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          {error ? (
            <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md font-mono">
              {error}
            </div>
          ) : (
            <pre className="bg-muted/30 p-2 rounded-md text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
              {currentValue !== undefined
                ? typeof currentValue === 'object'
                  ? JSON.stringify(currentValue, null, 2)
                  : String(currentValue)
                : 'undefined'}
            </pre>
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
                {transformer.name}.value
              </code>
              <span className="text-xs text-muted-foreground">读取计算结果</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {transformer.name}.refresh()
              </code>
              <span className="text-xs text-muted-foreground">强制重新计算</span>
            </div>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {transformer.name}.state
              </code>
              <span className="text-xs text-muted-foreground">
                状态 (idle/computing/success/error)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主组件
export function TransformerEditor({ className }: TransformerEditorProps) {
  useSignals();

  const appContext = useCoreContext();
  const [selectedTransformerId, setSelectedTransformerId] = useState<
    string | null
  >(null);

  // 获取所有转换器 - 直接访问 signal.value 以触发响应式更新
  const transformers = appContext.transformersSignal.value;

  // 选中的转换器
  const selectedTransformer = selectedTransformerId
    ? transformers.find((t) => t.id === selectedTransformerId) ?? null
    : null;

  const handleCreateTransformer = () => {
    const transformer = appContext.createTransformer();
    setSelectedTransformerId(transformer.id);
  };

  const handleDeleteTransformer = (id: string) => {
    appContext.deleteTransformer(id);
    if (selectedTransformerId === id) {
      setSelectedTransformerId(null);
    }
  };

  const handleUpdateTransformer = (updates: Partial<TransformerDefinition>) => {
    if (!selectedTransformerId) return;
    appContext.updateTransformer(selectedTransformerId, updates);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* 左侧列表 */}
      <div className="w-48 border-r flex flex-col bg-background/50">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            转换器列表
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateTransformer}
            className="h-6 w-6"
            title="新建转换器"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {transformers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Code2 className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">暂无转换器</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateTransformer}
                className="mt-2 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                新建转换器
              </Button>
            </div>
          ) : (
            transformers.map((transformer) => (
              <TransformerListItem
                key={transformer.id}
                transformer={transformer}
                isSelected={selectedTransformerId === transformer.id}
                onSelect={() => setSelectedTransformerId(transformer.id)}
                onDelete={() => handleDeleteTransformer(transformer.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器 */}
      <div className="flex-1 flex flex-col">
        {selectedTransformer ? (
          <TransformerDetailEditor
            transformer={selectedTransformer}
            onUpdate={handleUpdateTransformer}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Code2 className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">选择或创建转换器</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              转换器用于派生和转换数据
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
