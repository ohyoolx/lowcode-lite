import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useCoreContext } from '@/context/AppContext';
import { Code2, AlertCircle, Maximize2, X, Copy, CheckCheck } from 'lucide-react';
import { JsonView, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import { evalInSandbox } from '@lowcode-lite/core';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  /** 当前组件名（排除自身引用） */
  currentComponentName?: string;
}

interface CompletionItem {
  label: string;
  type: 'component' | 'query' | 'state' | 'transformer' | 'responder' | 'property';
  detail?: string;
  insertText: string;
}

/**
 * 表达式编辑器
 * 支持 {{expression}} 语法和自动补全
 */
export function ExpressionEditor({
  value,
  onChange,
  placeholder = '输入值或表达式 {{}}',
  className,
  multiline = false,
  currentComponentName,
}: ExpressionEditorProps) {
  const appContext = useCoreContext();
  const [isFocused, setIsFocused] = useState(false);
  const [showCompletions, setShowCompletions] = useState(false);
  const [completionFilter, setCompletionFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [evaluatedValue, setEvaluatedValue] = useState<any>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const completionRef = useRef<HTMLDivElement>(null);

  // 检查是否包含表达式
  const hasExpression = value?.includes('{{') && value?.includes('}}');
  
  // 获取当前正在输入的表达式部分
  const getCurrentExpressionContext = useCallback((text: string, position: number) => {
    // 查找光标前最近的 {{ 位置
    const beforeCursor = text.substring(0, position);
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    const lastCloseBrace = beforeCursor.lastIndexOf('}}');
    
    // 如果没有在表达式中，或者已经闭合
    if (lastOpenBrace === -1 || lastCloseBrace > lastOpenBrace) {
      return null;
    }
    
    // 获取当前表达式内容
    const exprStart = lastOpenBrace + 2;
    const exprContent = text.substring(exprStart, position);
    
    return {
      start: lastOpenBrace,
      exprStart,
      content: exprContent,
    };
  }, []);
  
  // 获取所有可用的补全项
  const getCompletionItems = useMemo((): CompletionItem[] => {
    const items: CompletionItem[] = [];
    const exposedValues = appContext.getAllExposedValues();
    
    // 获取各种数据源的名称列表，用于判断类型
    const queryNames = new Set(appContext.queries.map(q => q.name));
    const stateNames = new Set(appContext.tempStates.map(s => s.name));
    const transformerNames = new Set(appContext.transformers.map(t => t.name));
    const responderNames = new Set(appContext.dataResponders.map(r => r.name));
    
    // 添加组件和数据源
    for (const [name, values] of Object.entries(exposedValues)) {
      // 排除当前组件
      if (name === currentComponentName) continue;
      
      // 判断类型
      let itemType: CompletionItem['type'] = 'component';
      if (queryNames.has(name)) {
        itemType = 'query';
      } else if (stateNames.has(name)) {
        itemType = 'state';
      } else if (transformerNames.has(name)) {
        itemType = 'transformer';
      } else if (responderNames.has(name)) {
        itemType = 'responder';
      }
      
      // 名称作为顶级补全项
      items.push({
        label: name,
        type: itemType,
        detail: typeof values === 'object' ? `{${Object.keys(values || {}).join(', ')}}` : String(values),
        insertText: name,
      });
      
      // 属性作为子级补全项
      if (values && typeof values === 'object') {
        for (const [prop, propValue] of Object.entries(values)) {
          items.push({
            label: `${name}.${prop}`,
            type: 'property',
            detail: formatValue(propValue),
            insertText: `${name}.${prop}`,
          });
        }
      }
    }
    
    return items;
  }, [appContext, currentComponentName]);
  
  // 根据输入过滤补全项
  const filteredCompletions = useMemo(() => {
    if (!completionFilter) return getCompletionItems;
    
    const filter = completionFilter.toLowerCase();
    return getCompletionItems.filter(item => 
      item.label.toLowerCase().includes(filter) ||
      item.insertText.toLowerCase().includes(filter)
    );
  }, [getCompletionItems, completionFilter]);
  
  // 监听 value 变化，自动检测是否需要显示补全
  useEffect(() => {
    if (!isFocused || !value) return;
    
    const position = inputRef.current?.selectionStart ?? value.length;
    const exprContext = getCurrentExpressionContext(value, position);
    
    if (exprContext) {
      setCompletionFilter(exprContext.content);
      setShowCompletions(true);
      setSelectedIndex(0);
    }
  }, [value, isFocused, getCurrentExpressionContext]);
  
  // 表达式求值
  useEffect(() => {
    if (!hasExpression) {
      setEvaluatedValue(null);
      setEvalError(null);
      return;
    }
    
    try {
      const context = appContext.getExpressionContext();
      const result = evaluateTemplate(value, context);
      // 使用函数形式的 setState 来避免 React 将函数结果当作 updater 函数调用
      // 这样即使 result 是函数，也会正确地设置为状态值
      setEvaluatedValue(() => result);
      setEvalError(null);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : '求值失败');
      setEvaluatedValue(() => null);
    }
  }, [value, hasExpression, appContext]);
  
  // 处理输入变化
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart ?? 0;
    
    onChange(newValue);
    setCursorPosition(newPosition);
    
    // 检查是否需要显示补全
    const exprContext = getCurrentExpressionContext(newValue, newPosition);
    if (exprContext) {
      setCompletionFilter(exprContext.content);
      setShowCompletions(true);
      setSelectedIndex(0);
    } else {
      setShowCompletions(false);
      setCompletionFilter('');
    }
  }, [onChange, getCurrentExpressionContext]);
  
  // 选择补全项
  const selectCompletion = useCallback((item: CompletionItem) => {
    const exprContext = getCurrentExpressionContext(value, cursorPosition);
    if (!exprContext) return;
    
    // 替换表达式内容
    const before = value.substring(0, exprContext.exprStart);
    const after = value.substring(cursorPosition);
    const newValue = before + item.insertText + after;
    
    onChange(newValue);
    setShowCompletions(false);
    
    // 移动光标到插入内容之后
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = exprContext.exprStart + item.insertText.length;
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    }, 0);
  }, [value, cursorPosition, getCurrentExpressionContext, onChange]);
  
  // 键盘导航
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showCompletions || filteredCompletions.length === 0) {
      // 检查是否输入了 {{，如果是则显示补全
      if (e.key === '{') {
        const input = inputRef.current;
        if (input) {
          const pos = input.selectionStart ?? 0;
          const textBefore = value.substring(0, pos);
          if (textBefore.endsWith('{')) {
            setTimeout(() => {
              setShowCompletions(true);
              setCompletionFilter('');
              setSelectedIndex(0);
            }, 0);
          }
        }
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCompletions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        if (showCompletions && filteredCompletions[selectedIndex]) {
          e.preventDefault();
          selectCompletion(filteredCompletions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowCompletions(false);
        break;
    }
  }, [showCompletions, filteredCompletions, selectedIndex, selectCompletion, value]);
  
  // 处理光标变化
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setCursorPosition(target.selectionStart ?? 0);
  }, []);
  
  // 点击外部关闭补全
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (completionRef.current && !completionRef.current.contains(e.target as Node)) {
        setShowCompletions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      {/* 输入框 */}
      <div className={cn(
        'relative flex items-center',
        hasExpression && 'ring-2 ring-primary/20'
      )}>
        <InputComponent
          ref={inputRef as any}
          value={value ?? ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            hasExpression && 'pr-14 font-mono text-primary',
            multiline ? 'min-h-[80px] resize-y' : 'h-8',
            className
          )}
          spellCheck={false}
        />
        
        {/* 表达式标识和展开按钮 */}
        {hasExpression && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 bg-background">
            {evalError ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Code2 className="h-4 w-4 text-primary" />
            )}
          </div>
        )}
      </div>
      
      {/* 自动补全下拉列表 */}
      {showCompletions && filteredCompletions.length > 0 && (
        <div
          ref={completionRef}
          className={cn(
            'absolute z-50 mt-1 w-full max-h-60 overflow-auto',
            'rounded-md border bg-popover shadow-lg',
          )}
        >
          {filteredCompletions.map((item, index) => (
            <button
              key={item.label}
              onClick={() => selectCompletion(item)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left text-sm',
                'hover:bg-accent cursor-pointer',
                index === selectedIndex && 'bg-accent',
              )}
            >
              {/* 类型图标 */}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded font-medium',
                item.type === 'component' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                item.type === 'query' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                item.type === 'state' && 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                item.type === 'transformer' && 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
                item.type === 'responder' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
                item.type === 'property' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
              )}>
                {item.type === 'component' ? 'C' : 
                 item.type === 'query' ? 'Q' : 
                 item.type === 'state' ? 'S' :
                 item.type === 'transformer' ? 'T' :
                 item.type === 'responder' ? 'R' : 'P'}
              </span>
              
              {/* 标签 */}
              <span className="font-mono font-medium flex-1">{item.label}</span>
              
              {/* 详情 */}
              {item.detail && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {item.detail}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* 表达式预览 */}
      {hasExpression && isFocused && (
        <div className={cn(
          'mt-1 p-2 rounded-md text-xs',
          evalError 
            ? 'bg-destructive/10 text-destructive' 
            : 'bg-muted text-muted-foreground'
        )}>
          {evalError ? (
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>{evalError}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">计算结果：</span>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // 阻止输入框失去焦点
                    e.stopPropagation();
                    setShowFullPreview(true);
                  }}
                  className="p-1 hover:bg-background rounded transition-colors"
                  title="展开查看完整结果"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              </div>
              <div className="font-mono font-medium text-foreground bg-background/50 rounded px-2 py-1 max-h-24 overflow-auto text-xs">
                <ValueDisplayCompact value={evaluatedValue} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 全屏预览弹窗 */}
      {showFullPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowFullPreview(false)}
        >
          <div 
            className="bg-background border rounded-lg shadow-xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                <span className="font-medium">表达式求值结果</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(formatValueFull(evaluatedValue));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {}
                  }}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="复制结果"
                >
                  {copied ? (
                    <CheckCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullPreview(false)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* 表达式显示 */}
            <div className="px-4 py-2 bg-muted/50 border-b">
              <div className="text-xs text-muted-foreground mb-1">表达式</div>
              <code className="text-sm font-mono text-primary">{value}</code>
            </div>
            
            {/* 结果内容 */}
            <div className="flex-1 overflow-auto p-4">
              <ValueDisplay value={evaluatedValue} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 判断值是否为可展示的对象/数组（JSON 类型）
 */
function isJsonValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  return typeof value === 'object';
}

/**
 * 紧凑版值展示组件 - 用于内联预览区域
 */
function ValueDisplayCompact({ value }: { value: any }) {
  if (value === null) return <span className="text-orange-600">null</span>;
  if (value === undefined) return <span className="text-gray-500">undefined</span>;
  if (typeof value === 'string') return <span className="text-green-700">"{value}"</span>;
  if (typeof value === 'number') return <span className="text-blue-600">{value}</span>;
  if (typeof value === 'boolean') return <span className="text-purple-600">{String(value)}</span>;
  if (typeof value === 'function') return <span className="text-yellow-600">ƒ {value.name || 'anonymous'}()</span>;
  
  if (isJsonValue(value)) {
    try {
      const jsonStr = JSON.stringify(value, null, 2);
      // 如果太长，只显示前几行
      const lines = jsonStr.split('\n');
      if (lines.length > 4) {
        return (
          <pre className="whitespace-pre-wrap break-all">
            {lines.slice(0, 4).join('\n')}
            <span className="text-muted-foreground">... (点击展开查看完整内容)</span>
          </pre>
        );
      }
      return <pre className="whitespace-pre-wrap break-all">{jsonStr}</pre>;
    } catch {
      return <span>{String(value)}</span>;
    }
  }
  
  return <span>{String(value)}</span>;
}

/**
 * 值展示组件 - 智能展示 JSON 对象或普通值
 */
function ValueDisplay({ value }: { value: any }) {
  // 对于 null/undefined，使用文本展示
  if (value === null) {
    return (
      <span className="font-mono text-sm text-orange-600 dark:text-orange-400">
        null
      </span>
    );
  }
  
  if (value === undefined) {
    return (
      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
        undefined
      </span>
    );
  }
  
  // 对于字符串，展示带引号的格式
  if (typeof value === 'string') {
    return (
      <pre className="font-mono text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap break-all">
        "{value}"
      </pre>
    );
  }
  
  // 对于数字
  if (typeof value === 'number') {
    return (
      <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
        {String(value)}
      </span>
    );
  }
  
  // 对于布尔值
  if (typeof value === 'boolean') {
    return (
      <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
        {String(value)}
      </span>
    );
  }
  
  // 对于函数类型
  if (typeof value === 'function') {
    return (
      <span className="font-mono text-sm text-yellow-600 dark:text-yellow-400">
        ƒ {value.name || 'anonymous'}()
      </span>
    );
  }
  
  // 对于对象和数组，使用 JsonView 展示
  if (isJsonValue(value)) {
    return (
      <div className="json-view-wrapper">
        <style>{`
          .json-view-wrapper {
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
            font-size: 13px;
            line-height: 1.5;
          }
          .json-view-wrapper > div {
            background: transparent !important;
          }
          .json-view-wrapper [class*="label"] {
            color: #881391;
          }
          .json-view-wrapper [class*="string"] {
            color: #22863a;
          }
          .json-view-wrapper [class*="number"] {
            color: #005cc5;
          }
          .json-view-wrapper [class*="boolean"] {
            color: #6f42c1;
          }
          .json-view-wrapper [class*="null"],
          .json-view-wrapper [class*="undefined"] {
            color: #d73a49;
          }
          .json-view-wrapper [class*="punctuation"] {
            color: #6a737d;
          }
          .json-view-wrapper [class*="collapse"],
          .json-view-wrapper [class*="expand"] {
            cursor: pointer;
            user-select: none;
            color: #6a737d;
          }
          .json-view-wrapper [class*="collapse"]:hover,
          .json-view-wrapper [class*="expand"]:hover {
            color: #0366d6;
          }
          .dark .json-view-wrapper [class*="label"] {
            color: #c792ea;
          }
          .dark .json-view-wrapper [class*="string"] {
            color: #a5d6a7;
          }
          .dark .json-view-wrapper [class*="number"] {
            color: #82aaff;
          }
          .dark .json-view-wrapper [class*="boolean"] {
            color: #c792ea;
          }
          .dark .json-view-wrapper [class*="null"],
          .dark .json-view-wrapper [class*="undefined"] {
            color: #f07178;
          }
          .dark .json-view-wrapper [class*="punctuation"] {
            color: #89ddff;
          }
        `}</style>
        <JsonView 
          data={value} 
          shouldExpandNode={(level) => level < 2}
          style={defaultStyles}
        />
      </div>
    );
  }
  
  // 其他类型，使用字符串展示
  return (
    <pre className="font-mono text-sm whitespace-pre-wrap break-all">
      {String(value)}
    </pre>
  );
}

/**
 * 格式化值为字符串显示（简短版，用于补全列表）
 */
function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 50 ? value.slice(0, 47) + '...' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length > 3 
      ? `{${keys.slice(0, 3).join(', ')}, ...}`
      : `{${keys.join(', ')}}`;
  }
  return String(value);
}

/**
 * 格式化值为完整字符串显示（用于预览区域）
 */
function formatValueFull(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * 简单的模板求值函数
 */
function evaluateTemplate(template: string, context: Record<string, any>): any {
  // 检查是否是纯表达式
  const pureExprMatch = template.match(/^\{\{(.+)\}\}$/);
  if (pureExprMatch) {
    const expr = pureExprMatch[1].trim();
    return safeEvaluate(expr, context);
  }
  
  // 混合模板，替换所有表达式
  return template.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
    try {
      const result = safeEvaluate(expr.trim(), context);
      return String(result ?? '');
    } catch {
      return match;
    }
  });
}

/**
 * 安全求值表达式（使用沙箱环境）
 * 支持完整的 JavaScript 语法，包括：
 * - 数组方法：filter, map, reduce, find, some, every 等
 * - lodash：可通过 _ 访问，如 _.groupBy(), _.sortBy() 等
 * - 内置对象：Math, Date, JSON, String, Number 等
 */
function safeEvaluate(expr: string, context: Record<string, any>): any {
  // 简单属性路径 (如 table1.data)
  if (/^[\w.]+$/.test(expr)) {
    return getValueByPath(context, expr);
  }
  
  // 复杂表达式，使用沙箱求值
  // 支持如：table1.data.filter(item => item.age > 25)
  // 支持如：_.groupBy(table1.data, 'category')
  return evalInSandbox(expr, context);
}

/**
 * 根据路径获取对象属性值
 */
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
