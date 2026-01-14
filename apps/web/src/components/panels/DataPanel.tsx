import { useState } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry } from '@lowcode-lite/core';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';

interface DataPanelProps {
  className?: string;
}

// 格式化值的显示
function formatValue(value: any, maxLength = 30): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    if (value.length > maxLength) {
      return `"${value.slice(0, maxLength)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[] ${value.length} 项`;
  }
  if (typeof value === 'object') {
    return `{} ${Object.keys(value).length} 项`;
  }
  return String(value);
}

// 获取值的颜色类名
function getValueColorClass(value: any): string {
  if (typeof value === 'string') return 'text-amber-600 dark:text-amber-400';
  if (typeof value === 'number') return 'text-blue-600 dark:text-blue-400';
  if (typeof value === 'boolean') return 'text-purple-600 dark:text-purple-400';
  if (value === null || value === undefined) return 'text-gray-400 italic';
  return 'text-muted-foreground';
}

// 树节点组件
interface TreeNodeProps {
  name: string;
  value: any;
  depth?: number;
  isComponentRoot?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
}

function TreeNode({ 
  name, 
  value, 
  depth = 0, 
  isComponentRoot = false,
  onSelect,
  isSelected = false,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const [copied, setCopied] = useState(false);
  
  const isExpandable = value !== null && typeof value === 'object';
  const hasChildren = isExpandable && Object.keys(value).length > 0;
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClick = () => {
    if (isComponentRoot && onSelect) {
      onSelect();
    }
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-0.5 group cursor-pointer rounded transition-colors',
          isComponentRoot && isSelected && 'bg-primary/10',
          !isComponentRoot && 'hover:bg-muted/50'
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
        onClick={handleClick}
      >
        {/* 展开/折叠箭头 */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* 键名 */}
        <span className={cn(
          'text-sm',
          isComponentRoot ? 'font-medium text-primary' : 'text-foreground'
        )}>
          {name}
        </span>

        {/* 值 */}
        {!hasChildren && (
          <>
            <span className="text-muted-foreground text-sm mx-0.5">:</span>
            <span className={cn('text-sm truncate flex-1', getValueColorClass(value))}>
              {formatValue(value)}
            </span>
          </>
        )}

        {/* 复制按钮 */}
        <button
          onClick={handleCopy}
          className={cn(
            'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ml-auto',
            copied ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'
          )}
          title="复制"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div>
          {Object.entries(value).map(([key, val]) => (
            <TreeNode
              key={key}
              name={key}
              value={val}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 从组件的 props 中提取 value 值
function getComponentValue(props: Record<string, any>, type: string): any {
  const definition = componentRegistry.get(type);
  if (!definition) return undefined;
  
  // 检查组件是否有 value 属性
  if ('value' in definition.props) {
    const propValue = props.value;
    if (propValue !== undefined) {
      if (typeof propValue === 'object' && propValue?.expression) {
        return `{{${propValue.expression}}}`;
      } else if (typeof propValue === 'object' && propValue?.value !== undefined) {
        return propValue.value;
      }
      return propValue;
    }
    return definition.props.value.default;
  }
  
  // 检查其他可能的值属性（checked, selectedValue 等）
  if ('checked' in definition.props) {
    const propValue = props.checked;
    if (propValue !== undefined) {
      if (typeof propValue === 'object' && propValue?.value !== undefined) {
        return propValue.value;
      }
      return propValue;
    }
    return definition.props.checked.default;
  }
  
  return undefined;
}

// 收集表单子组件的值
function collectFormValues(
  children: Array<{ name: string; type: string; props: Record<string, any>; children?: any[] }> | undefined
): Record<string, any> {
  if (!children || children.length === 0) return {};
  
  const values: Record<string, any> = {};
  
  for (const child of children) {
    const value = getComponentValue(child.props, child.type);
    if (value !== undefined) {
      values[child.name] = value;
    }
    
    // 递归收集嵌套容器中的值
    if (child.children && child.children.length > 0) {
      const nestedValues = collectFormValues(child.children);
      Object.assign(values, nestedValues);
    }
  }
  
  return values;
}

// 从组件数据中提取暴露的值
function getComponentExposedValues(
  data: { type: string; props: Record<string, any>; children?: any[] }
): Record<string, any> {
  const definition = componentRegistry.get(data.type);
  if (!definition) return {};
  
  const result: Record<string, any> = {};
  
  // 如果是表单组件，添加 values 属性
  if (data.type === 'form' && data.children) {
    result.values = collectFormValues(data.children);
  }
  
  for (const [key, propDef] of Object.entries(definition.props)) {
    // 获取当前值，如果没有设置则使用默认值
    const propValue = data.props[key];
    if (propValue !== undefined) {
      // 如果是表达式绑定，显示表达式
      if (typeof propValue === 'object' && propValue?.expression) {
        result[key] = `{{${propValue.expression}}}`;
      } else if (typeof propValue === 'object' && propValue?.value !== undefined) {
        result[key] = propValue.value;
      } else {
        result[key] = propValue;
      }
    } else {
      result[key] = propDef.default;
    }
  }
  return result;
}

export function DataPanel({ className }: DataPanelProps) {
  useSignals();
  
  const appContext = useCoreContext();
  const editor = useEditor();
  const selectedId = editor.selectedComponentId.value;
  
  // 直接从 schema 中获取组件列表（这是响应式的）
  const allComponents = appContext.getAllComponents();
  
  // 构建组件数据树
  // 我们需要使用原始组件数据（包含 children）来正确收集表单值
  const componentDataMap: Record<string, Record<string, any>> = {};
  for (const comp of allComponents) {
    // 对于表单组件，需要传递完整的组件数据（包括 children）
    componentDataMap[comp.name] = getComponentExposedValues({
      type: comp.type,
      props: comp.props,
      children: comp.children,
    });
  }
  
  const componentNames = Object.keys(componentDataMap);

  const handleSelectComponent = (name: string) => {
    const comp = allComponents.find(c => c.name === name);
    if (comp) {
      editor.selectedComponentId.value = comp.id;
    }
  };

  // 获取选中组件的名称
  const selectedComponent = selectedId 
    ? allComponents.find(c => c.id === selectedId)
    : null;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 标题 */}
      <div className="px-3 py-2 border-b text-sm font-medium text-muted-foreground">
        状态
      </div>
      
      {/* 树形结构 */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {componentNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">暂无组件</p>
          </div>
        ) : (
          componentNames.map(name => (
            <TreeNode
              key={name}
              name={name}
              value={componentDataMap[name]}
              isComponentRoot
              onSelect={() => handleSelectComponent(name)}
              isSelected={selectedComponent?.name === name}
            />
          ))
        )}
      </div>
    </div>
  );
}

// 导出用于大纲面板的数据摘要组件
interface DataSummaryProps {
  componentName: string;
  componentType: string;
  componentProps: Record<string, any>;
  className?: string;
}

export function DataSummary({ componentName, componentType, componentProps, className }: DataSummaryProps) {
  useSignals();
  
  const data = getComponentExposedValues({ type: componentType, props: componentProps });
  
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  
  // 获取主要值（通常是 value）
  const primaryValue = data.value ?? data.checked ?? data.selectedValue ?? Object.values(data)[0];
  
  if (primaryValue === undefined) {
    return null;
  }
  
  return (
    <span className={cn(
      'text-xs truncate max-w-[80px]',
      getValueColorClass(primaryValue),
      className
    )}>
      {formatValue(primaryValue, 15)}
    </span>
  );
}
