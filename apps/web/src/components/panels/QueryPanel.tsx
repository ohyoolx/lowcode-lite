import { useState, useEffect } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Play,
  Trash2,
  Globe,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import type { QueryDefinition, RestApiConfig, HttpMethod, BodyType, KeyValuePair } from '@lowcode-lite/shared';

interface QueryPanelProps {
  className?: string;
}

// HTTP 方法选项
const HTTP_METHODS: { value: HttpMethod; label: string; color: string }[] = [
  { value: 'GET', label: 'GET', color: 'text-green-600' },
  { value: 'POST', label: 'POST', color: 'text-blue-600' },
  { value: 'PUT', label: 'PUT', color: 'text-orange-600' },
  { value: 'DELETE', label: 'DELETE', color: 'text-red-600' },
  { value: 'PATCH', label: 'PATCH', color: 'text-purple-600' },
  { value: 'HEAD', label: 'HEAD', color: 'text-gray-600' },
  { value: 'OPTIONS', label: 'OPTIONS', color: 'text-gray-600' },
];

// Body 类型选项
const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'application/json', label: 'JSON' },
  { value: 'text/plain', label: 'Raw' },
  { value: 'application/x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'multipart/form-data', label: 'Form Data' },
];

// Query 列表项
function QueryListItem({
  query,
  isSelected,
  onSelect,
  onDelete,
}: {
  query: QueryDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const appContext = useCoreContext();
  const queryInstance = appContext.queryManager.getQuery(query.id);
  const state = queryInstance?.state ?? 'idle';

  const getStateIcon = () => {
    switch (state) {
      case 'loading':
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
          : 'hover:bg-muted/50 text-foreground'
      )}
      onClick={onSelect}
    >
      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm truncate flex-1">{query.name}</span>
      {getStateIcon()}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        title="删除查询"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
}

// 键值对编辑器
function KeyValueEditor({
  pairs,
  onChange,
  placeholder = { key: 'Key', value: 'Value' },
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: { key: string; value: string };
}) {
  const handleAdd = () => {
    onChange([...pairs, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    onChange(
      pairs.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      )
    );
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pair.enabled !== false}
            onChange={(e) => handleChange(index, 'enabled', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
          />
          <Input
            value={pair.key}
            onChange={(e) => handleChange(index, 'key', e.target.value)}
            placeholder={placeholder.key}
            className="h-7 text-xs flex-1"
          />
          <Input
            value={pair.value}
            onChange={(e) => handleChange(index, 'value', e.target.value)}
            placeholder={placeholder.value}
            className="h-7 text-xs flex-1"
          />
          <button
            onClick={() => handleRemove(index)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="删除"
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="h-7 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        添加
      </Button>
    </div>
  );
}

// Query 编辑器
function QueryEditor({
  query,
  onUpdate,
  onRun,
}: {
  query: QueryDefinition;
  onUpdate: (updates: Partial<QueryDefinition>) => void;
  onRun: () => void;
}) {
  useSignals();
  
  const appContext = useCoreContext();
  const queryInstance = appContext.queryManager.getQuery(query.id);
  const isFetching = queryInstance?.isFetching ?? false;
  const lastResult = queryInstance?.lastResult;
  
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'settings'>('params');
  const [copied, setCopied] = useState(false);

  const config = query.config as RestApiConfig;

  const updateConfig = (updates: Partial<RestApiConfig>) => {
    onUpdate({
      config: { ...config, ...updates },
    });
  };

  const handleCopyResult = () => {
    if (lastResult?.data) {
      navigator.clipboard.writeText(JSON.stringify(lastResult.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const selectedMethod = HTTP_METHODS.find((m) => m.value === config.method);

  return (
    <div className="flex flex-col h-full">
      {/* Header - 名称和运行按钮 */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={query.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 font-mono text-sm flex-1"
            placeholder="查询名称"
          />
          <Button
            onClick={onRun}
            disabled={isFetching}
            size="sm"
            className="h-8"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            运行
          </Button>
        </div>
      </div>

      {/* URL 输入 */}
      <div className="p-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Method 选择 */}
          <select
            value={config.method}
            onChange={(e) => updateConfig({ method: e.target.value as HttpMethod })}
            className={cn(
              'h-8 px-2 rounded-md border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring',
              selectedMethod?.color
            )}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          
          {/* URL 输入 - 直接更新配置 */}
          <Input
            value={config.url}
            onChange={(e) => {
              updateConfig({ url: e.target.value });
            }}
            placeholder="输入 URL，支持表达式 {{ }}"
            className="h-8 flex-1 font-mono text-sm"
          />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b flex-shrink-0">
        {(['params', 'headers', 'body', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-xs font-medium transition-colors relative',
              activeTab === tab
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {{
              params: 'Params',
              headers: 'Headers',
              body: 'Body',
              settings: '设置',
            }[tab]}
            {/* 参数数量标记 */}
            {tab === 'params' && config.params && config.params.length > 0 && (
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">
                {config.params.length}
              </span>
            )}
            {tab === 'headers' && config.headers && config.headers.length > 0 && (
              <span className="ml-1 text-[10px] bg-muted px-1 rounded">
                {config.headers.length}
              </span>
            )}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'params' && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">URL 查询参数</p>
            <KeyValueEditor
              pairs={config.params ?? []}
              onChange={(params) => updateConfig({ params })}
              placeholder={{ key: 'Key', value: 'Value' }}
            />
          </div>
        )}

        {activeTab === 'headers' && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">请求头</p>
            <KeyValueEditor
              pairs={config.headers ?? []}
              onChange={(headers) => updateConfig({ headers })}
              placeholder={{ key: 'Header', value: 'Value' }}
            />
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Body 类型</label>
              <select
                value={config.bodyType}
                onChange={(e) => updateConfig({ bodyType: e.target.value as BodyType })}
                className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BODY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {(config.bodyType === 'application/json' || config.bodyType === 'text/plain') && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">内容</label>
                <textarea
                  value={config.body ?? ''}
                  onChange={(e) => updateConfig({ body: e.target.value })}
                  placeholder={config.bodyType === 'application/json' ? '{"key": "value"}' : '文本内容...'}
                  className="mt-1 w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            )}

            {(config.bodyType === 'application/x-www-form-urlencoded' ||
              config.bodyType === 'multipart/form-data') && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Form Data</label>
                <KeyValueEditor
                  pairs={config.formData ?? []}
                  onChange={(formData) => updateConfig({ formData })}
                  placeholder={{ key: 'Field', value: 'Value' }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">超时时间 (ms)</label>
              <Input
                type="number"
                value={config.timeout ?? 10000}
                onChange={(e) => updateConfig({ timeout: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={query.runOnInit ?? false}
                  onChange={(e) => onUpdate({ runOnInit: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">页面加载时自动运行</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={query.cancelPrevious ?? true}
                  onChange={(e) => onUpdate({ cancelPrevious: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">自动取消之前的请求</span>
              </label>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">缓存时间 (ms，0 表示不缓存)</label>
              <Input
                type="number"
                value={query.cacheTime ?? 0}
                onChange={(e) => onUpdate({ cacheTime: Number(e.target.value) })}
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 响应结果 */}
      {lastResult && (
        <div className="border-t flex-shrink-0">
          <div className="p-2 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs font-medium">
                {lastResult.success ? '请求成功' : '请求失败'}
              </span>
              {lastResult.code && (
                <span className="text-xs text-muted-foreground">
                  状态码: {lastResult.code}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                耗时: {lastResult.runTime}ms
              </span>
            </div>
            <button
              onClick={handleCopyResult}
              className={cn(
                'p-1 rounded transition-colors',
                copied ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'
              )}
              title="复制响应"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <div className="max-h-48 overflow-auto p-2 bg-muted/10">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {lastResult.success
                ? JSON.stringify(lastResult.data, null, 2)
                : lastResult.message}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// 主面板
export function QueryPanel({ className }: QueryPanelProps) {
  useSignals();

  const appContext = useCoreContext();
  const editor = useEditor();
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // 获取所有查询 - 直接访问 signal.value 以触发响应式更新
  const queries = appContext.queriesSignal.value;
  
  // 选中的查询 - 直接计算，不使用 useMemo，确保响应式更新
  const selectedQuery = selectedQueryId 
    ? queries.find((q) => q.id === selectedQueryId) ?? null
    : null;

  const handleCreateQuery = () => {
    const query = appContext.createRestApiQuery();
    setSelectedQueryId(query.id);
  };

  const handleDeleteQuery = (id: string) => {
    appContext.deleteQuery(id);
    if (selectedQueryId === id) {
      setSelectedQueryId(null);
    }
  };

  const handleUpdateQuery = (updates: Partial<QueryDefinition>) => {
    if (!selectedQueryId) return;
    appContext.updateQuery(selectedQueryId, updates);
  };

  const handleRunQuery = async () => {
    if (!selectedQueryId) return;
    await appContext.runQuery(selectedQueryId);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* 左侧列表 */}
      <div className="w-48 border-r flex flex-col bg-background/50">
        <div className="p-2 border-b flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">查询列表</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateQuery}
            className="h-6 w-6"
            title="新建查询"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {queries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs">暂无查询</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateQuery}
                className="mt-2 h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                新建查询
              </Button>
            </div>
          ) : (
            queries.map((query) => (
              <QueryListItem
                key={query.id}
                query={query}
                isSelected={selectedQueryId === query.id}
                onSelect={() => setSelectedQueryId(query.id)}
                onDelete={() => handleDeleteQuery(query.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器 */}
      <div className="flex-1 flex flex-col">
        {selectedQuery ? (
          <QueryEditor
            query={selectedQuery}
            onUpdate={handleUpdateQuery}
            onRun={handleRunQuery}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Settings2 className="h-8 w-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">选择或创建查询</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              点击左侧查询或新建一个
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
