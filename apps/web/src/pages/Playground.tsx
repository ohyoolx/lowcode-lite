import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Checkbox,
  Label,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Textarea,
  Progress,
} from '@lowcode-lite/ui';
import { cn } from '../lib/utils';
import { ChevronLeft, Copy, Check, RotateCcw, Sun, Moon, Code, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

// 组件配置定义
interface PropConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color';
  label: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
  description?: string;
}

interface ComponentConfig {
  name: string;
  category: string;
  component: React.ComponentType<Record<string, unknown>>;
  props: PropConfig[];
  exposedValues?: { name: string; description: string }[];
  defaultChildren?: React.ReactNode;
}

// 组件注册表
const componentRegistry: ComponentConfig[] = [
  {
    name: 'Button',
    category: 'Basic',
    component: Button as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Destructive', value: 'destructive' },
          { label: 'Outline', value: 'outline' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Link', value: 'link' },
        ],
        description: '按钮样式变体',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Small', value: 'sm' },
          { label: 'Large', value: 'lg' },
          { label: 'Icon', value: 'icon' },
        ],
        description: '按钮尺寸',
      },
      {
        name: 'disabled',
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: '是否禁用',
      },
      {
        name: 'loading',
        type: 'boolean',
        label: 'Loading',
        defaultValue: false,
        description: '是否显示加载状态',
      },
    ],
    exposedValues: [
      { name: 'onClick', description: '点击事件回调' },
    ],
    defaultChildren: 'Click me',
  },
  {
    name: 'Input',
    category: 'Form',
    component: Input as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'type',
        type: 'select',
        label: 'Type',
        defaultValue: 'text',
        options: [
          { label: 'Text', value: 'text' },
          { label: 'Password', value: 'password' },
          { label: 'Email', value: 'email' },
          { label: 'Number', value: 'number' },
        ],
        description: '输入框类型',
      },
      {
        name: 'placeholder',
        type: 'string',
        label: 'Placeholder',
        defaultValue: 'Enter text...',
        description: '占位提示文字',
      },
      {
        name: 'disabled',
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: '是否禁用',
      },
    ],
    exposedValues: [
      { name: 'value', description: '当前输入值' },
      { name: 'onChange', description: '值变化事件回调' },
    ],
  },
  {
    name: 'Switch',
    category: 'Form',
    component: Switch as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'checked',
        type: 'boolean',
        label: 'Checked',
        defaultValue: false,
        description: '是否选中',
      },
      {
        name: 'disabled',
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: '是否禁用',
      },
    ],
    exposedValues: [
      { name: 'checked', description: '当前选中状态' },
      { name: 'onCheckedChange', description: '状态变化回调' },
    ],
  },
  {
    name: 'Checkbox',
    category: 'Form',
    component: Checkbox as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'checked',
        type: 'boolean',
        label: 'Checked',
        defaultValue: false,
        description: '是否选中',
      },
      {
        name: 'disabled',
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: '是否禁用',
      },
    ],
    exposedValues: [
      { name: 'checked', description: '当前选中状态' },
      { name: 'onCheckedChange', description: '状态变化回调' },
    ],
  },
  {
    name: 'Badge',
    category: 'Basic',
    component: Badge as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Destructive', value: 'destructive' },
          { label: 'Outline', value: 'outline' },
        ],
        description: '徽章样式变体',
      },
    ],
    defaultChildren: 'Badge',
  },
  {
    name: 'Progress',
    category: 'Data',
    component: Progress as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'value',
        type: 'number',
        label: 'Value',
        defaultValue: 50,
        description: '进度值 (0-100)',
      },
    ],
    exposedValues: [
      { name: 'value', description: '当前进度值' },
    ],
  },
  {
    name: 'Textarea',
    category: 'Form',
    component: Textarea as React.ComponentType<Record<string, unknown>>,
    props: [
      {
        name: 'placeholder',
        type: 'string',
        label: 'Placeholder',
        defaultValue: 'Enter text...',
        description: '占位提示文字',
      },
      {
        name: 'disabled',
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: '是否禁用',
      },
      {
        name: 'rows',
        type: 'number',
        label: 'Rows',
        defaultValue: 4,
        description: '行数',
      },
    ],
    exposedValues: [
      { name: 'value', description: '当前输入值' },
      { name: 'onChange', description: '值变化事件回调' },
    ],
  },
];

// 属性编辑器组件
function PropEditor({
  config,
  value,
  onChange,
}: {
  config: PropConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (config.type) {
    case 'string':
      return (
        <Input
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.label}
          className="h-8"
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={config.label}
          className="h-8"
        />
      );
    case 'boolean':
      return (
        <Switch
          checked={value as boolean}
          onCheckedChange={onChange}
        />
      );
    case 'select':
      return (
        <Select
          value={value as string}
          onValueChange={onChange}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={config.label} />
          </SelectTrigger>
          <SelectContent>
            {config.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'color':
      return (
        <Input
          type="color"
          value={(value as string) || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full p-1"
        />
      );
    default:
      return null;
  }
}

// Children 编辑器
function ChildrenEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter children content..."
      className="min-h-[60px] text-sm font-mono"
    />
  );
}

// 代码预览组件
function CodePreview({
  componentName,
  props,
  children,
}: {
  componentName: string;
  props: Record<string, unknown>;
  children?: string;
}) {
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    const propsString = Object.entries(props)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return value ? key : null;
        }
        if (typeof value === 'string') {
          return `${key}="${value}"`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      })
      .filter(Boolean)
      .join(' ');

    if (children) {
      return `<${componentName}${propsString ? ' ' + propsString : ''}>\n  ${children}\n</${componentName}>`;
    }
    return `<${componentName}${propsString ? ' ' + propsString : ''} />`;
  }, [componentName, props, children]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative">
      <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-sm overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-slate-50"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// 事件日志组件
function EventLog({
  events,
  onClear,
}: {
  events: { timestamp: Date; event: string; data?: unknown }[];
  onClear: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">事件日志</span>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
          清空
        </Button>
      </div>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto bg-slate-950 rounded-lg p-2 min-h-[120px] max-h-[200px]"
      >
        {events.length === 0 ? (
          <p className="text-slate-500 text-xs text-center py-4">暂无事件</p>
        ) : (
          events.map((event, index) => (
            <div key={index} className="text-xs font-mono mb-1">
              <span className="text-slate-500">
                {event.timestamp.toLocaleTimeString()}
              </span>
              <span className="text-emerald-400 ml-2">{event.event}</span>
              {event.data !== undefined && (
                <span className="text-amber-400 ml-2">
                  {JSON.stringify(event.data)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Playground() {
  const [selectedComponent, setSelectedComponent] = useState<ComponentConfig>(
    componentRegistry[0]
  );
  const [propsValues, setPropsValues] = useState<Record<string, unknown>>({});
  const [childrenValue, setChildrenValue] = useState<string>('');
  const [events, setEvents] = useState<{ timestamp: Date; event: string; data?: unknown }[]>([]);
  const [exposedState, setExposedState] = useState<Record<string, unknown>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // 按分类分组
  const groupedComponents = useMemo(() => {
    const groups: Record<string, ComponentConfig[]> = {};
    componentRegistry.forEach((comp) => {
      if (!groups[comp.category]) {
        groups[comp.category] = [];
      }
      groups[comp.category].push(comp);
    });
    return groups;
  }, []);

  // 切换组件时重置状态
  const handleSelectComponent = useCallback((comp: ComponentConfig) => {
    setSelectedComponent(comp);
    // 初始化默认值
    const defaults: Record<string, unknown> = {};
    comp.props.forEach((prop) => {
      if (prop.defaultValue !== undefined) {
        defaults[prop.name] = prop.defaultValue;
      }
    });
    setPropsValues(defaults);
    setChildrenValue(
      typeof comp.defaultChildren === 'string' ? comp.defaultChildren : ''
    );
    setEvents([]);
    setExposedState({});
  }, []);

  // 更新属性值
  const handlePropChange = useCallback((name: string, value: unknown) => {
    setPropsValues((prev) => ({ ...prev, [name]: value }));
    // 对于某些特殊属性，更新暴露值
    if (name === 'checked' || name === 'value') {
      setExposedState((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  // 重置所有属性
  const handleReset = useCallback(() => {
    const defaults: Record<string, unknown> = {};
    selectedComponent.props.forEach((prop) => {
      if (prop.defaultValue !== undefined) {
        defaults[prop.name] = prop.defaultValue;
      }
    });
    setPropsValues(defaults);
    setChildrenValue(
      typeof selectedComponent.defaultChildren === 'string'
        ? selectedComponent.defaultChildren
        : ''
    );
    setEvents([]);
    setExposedState({});
  }, [selectedComponent]);

  // 记录事件
  const logEvent = useCallback((event: string, data?: unknown) => {
    setEvents((prev) => [...prev, { timestamp: new Date(), event, data }]);
  }, []);

  // 构建组件 props
  const componentProps = useMemo(() => {
    const props: Record<string, unknown> = { ...propsValues };

    // 添加事件处理器
    props.onClick = () => logEvent('onClick');
    props.onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e?.target?.value ?? e;
      logEvent('onChange', value);
      setExposedState((prev) => ({ ...prev, value }));
    };
    props.onCheckedChange = (checked: boolean) => {
      logEvent('onCheckedChange', checked);
      setExposedState((prev) => ({ ...prev, checked }));
      handlePropChange('checked', checked);
    };
    props.onValueChange = (value: string) => {
      logEvent('onValueChange', value);
      setExposedState((prev) => ({ ...prev, value }));
    };
    props.onFocus = () => logEvent('onFocus');
    props.onBlur = () => logEvent('onBlur');

    return props;
  }, [propsValues, logEvent, handlePropChange]);

  // 初始化默认值
  useEffect(() => {
    handleSelectComponent(componentRegistry[0]);
  }, [handleSelectComponent]);

  const Component = selectedComponent.component;

  return (
    <div className={cn('min-h-screen', darkMode && 'dark')}>
      <div className="bg-background text-foreground min-h-screen">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 sticky top-0 bg-background/95 backdrop-blur z-50">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                返回
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <h1 className="text-lg font-semibold tracking-tight">
              🎨 组件 Playground
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showCode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowCode(!showCode)}
              className="gap-1"
            >
              {showCode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
              {showCode ? '预览' : '代码'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="h-8 w-8"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <div className="flex h-[calc(100vh-56px)]">
          {/* 左侧：组件列表 */}
          <aside className="w-56 border-r bg-muted/30 overflow-y-auto flex-shrink-0">
            <div className="p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                组件库
              </p>
              {Object.entries(groupedComponents).map(([category, components]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {category}
                  </p>
                  <div className="space-y-1">
                    {components.map((comp) => (
                      <button
                        key={comp.name}
                        onClick={() => handleSelectComponent(comp)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                          selectedComponent.name === comp.name
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        {comp.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* 中间：预览区域 */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* 组件预览 */}
            <div className="flex-1 p-6 overflow-auto">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {selectedComponent.name} 预览
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
                      <RotateCcw className="h-3 w-3" />
                      重置
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showCode ? (
                    <CodePreview
                      componentName={selectedComponent.name}
                      props={propsValues}
                      children={childrenValue}
                    />
                  ) : (
                    <div
                      className={cn(
                        'min-h-[200px] flex items-center justify-center rounded-lg border-2 border-dashed p-8',
                        darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                      )}
                    >
                      <Component {...componentProps}>
                        {childrenValue || undefined}
                      </Component>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 事件日志 */}
            <div className="border-t p-4 bg-muted/30">
              <EventLog events={events} onClear={() => setEvents([])} />
            </div>
          </main>

          {/* 右侧：属性面板 */}
          <aside className="w-80 border-l bg-muted/30 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              {/* 属性编辑 */}
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  属性 Props
                </p>
                <div className="space-y-4">
                  {selectedComponent.props.map((prop) => (
                    <div key={prop.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm">{prop.label}</Label>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {prop.name}
                        </code>
                      </div>
                      <PropEditor
                        config={prop}
                        value={propsValues[prop.name]}
                        onChange={(value) => handlePropChange(prop.name, value)}
                      />
                      {prop.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {prop.description}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Children 编辑器 */}
                  {selectedComponent.defaultChildren !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label className="text-sm">Children</Label>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          children
                        </code>
                      </div>
                      <ChildrenEditor
                        value={childrenValue}
                        onChange={setChildrenValue}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        组件子内容
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* 暴露值展示 */}
              {selectedComponent.exposedValues && selectedComponent.exposedValues.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    暴露值 Exposed Values
                  </p>
                  <div className="space-y-2">
                    {selectedComponent.exposedValues.map((exposed) => (
                      <div
                        key={exposed.name}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div>
                          <code className="text-sm font-medium">{exposed.name}</code>
                          <p className="text-xs text-muted-foreground">
                            {exposed.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {exposedState[exposed.name] !== undefined
                            ? JSON.stringify(exposedState[exposed.name])
                            : '—'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
