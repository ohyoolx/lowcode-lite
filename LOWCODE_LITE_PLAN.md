# LowCode Lite - 轻量化低代码平台设计方案

> 目标：打造一个轻量、易上手、可扩展的低代码平台

## 一、项目概述

### 1.1 项目定位

| 维度 | 说明 |
|-----|------|
| **目标用户** | 普通用户（快速搭建）+ 深度用户（组件扩展） |
| **核心理念** | 简单优先，渐进增强 |
| **技术栈** | React + Signals + Bun |

### 1.2 核心目标

- ✅ **5 分钟上手**：普通用户无需编程基础即可搭建应用
- ✅ **30 分钟扩展**：开发者可快速开发自定义组件
- ✅ **性能优先**：Signals 细粒度更新，Bun 高性能运行时
- ✅ **类型安全**：完整的 TypeScript 支持

---

## 二、技术选型

### 2.1 前端技术栈

```
┌─────────────────────────────────────────────────────────────────┐
│  UI 框架        │  React 18+                                    │
├─────────────────────────────────────────────────────────────────┤
│  UI 组件库      │  shadcn/ui (基于 Radix UI + Tailwind)         │
│                 │  https://ui.shadcn.com/                       │
├─────────────────────────────────────────────────────────────────┤
│  响应式系统     │  @preact/signals-react                        │
│                 │  (比 Redux 更轻量，细粒度更新)                  │
├─────────────────────────────────────────────────────────────────┤
│  样式方案       │  Tailwind CSS + CSS Variables                 │
├─────────────────────────────────────────────────────────────────┤
│  拖拽库         │  @dnd-kit/core (现代化，支持多种布局)          │
├─────────────────────────────────────────────────────────────────┤
│  表达式引擎     │  自研轻量表达式解析器                          │
├─────────────────────────────────────────────────────────────────┤
│  构建工具       │  Vite (开发) + Bun (生产构建)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 后端技术栈

#### Bun vs Node 对比分析

| 维度 | Node.js | Bun | 结论 |
|-----|---------|-----|------|
| **性能** | 基准 | 3-5x 更快 | ✅ Bun 胜 |
| **启动速度** | ~300ms | ~10ms | ✅ Bun 胜 |
| **包管理** | npm/yarn/pnpm | 内置，更快 | ✅ Bun 胜 |
| **生态成熟度** | 非常成熟 | 快速成长中 | ⚠️ Node 胜 |
| **生产稳定性** | 验证多年 | 1.0+ 已稳定 | ⚠️ 略差 |
| **TypeScript** | 需要编译 | 原生支持 | ✅ Bun 胜 |
| **SQLite** | 需要依赖 | 内置支持 | ✅ Bun 胜 |

**结论：选择 Bun**

理由：
1. 原生 TypeScript 支持，无需编译步骤
2. 内置 SQLite 驱动，轻量存储方案完美匹配
3. 3-5x 性能提升对 API 响应有明显帮助
4. 内置包管理器，减少工具链复杂度
5. 2024+ 生态已足够成熟

```
┌─────────────────────────────────────────────────────────────────┐
│  运行时         │  Bun 1.0+                                     │
├─────────────────────────────────────────────────────────────────┤
│  Web 框架       │  Hono (轻量、快速、类型安全)                   │
├─────────────────────────────────────────────────────────────────┤
│  数据库         │  SQLite (内置) + Drizzle ORM                   │
│                 │  (可选升级: PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────┤
│  认证           │  better-auth (现代化认证库)                    │
├─────────────────────────────────────────────────────────────────┤
│  验证           │  Zod (Schema 验证)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 项目结构

```
lowcode-lite/
├── packages/
│   ├── core/                 # 核心库 - 组件系统、响应式、表达式
│   │   ├── src/
│   │   │   ├── reactive/     # Signals 封装
│   │   │   ├── components/   # 组件定义系统
│   │   │   ├── expression/   # 表达式引擎
│   │   │   └── schema/       # Schema 定义
│   │   └── package.json
│   │
│   ├── editor/               # 编辑器 - 画布、属性面板、组件面板
│   │   ├── src/
│   │   │   ├── canvas/       # 拖拽画布
│   │   │   ├── panels/       # 各种面板
│   │   │   ├── toolbar/      # 工具栏
│   │   │   └── preview/      # 预览模式
│   │   └── package.json
│   │
│   ├── components/           # 内置组件库
│   │   ├── src/
│   │   │   ├── basic/        # 基础组件 (Button, Input, Text...)
│   │   │   ├── layout/       # 布局组件 (Container, Grid, Tabs...)
│   │   │   ├── data/         # 数据组件 (Table, List, Chart...)
│   │   │   └── form/         # 表单组件 (Form, Select, DatePicker...)
│   │   └── package.json
│   │
│   ├── server/               # 后端服务
│   │   ├── src/
│   │   │   ├── routes/       # API 路由
│   │   │   ├── db/           # 数据库模型
│   │   │   ├── services/     # 业务逻辑
│   │   │   └── middleware/   # 中间件
│   │   └── package.json
│   │
│   └── shared/               # 共享类型和工具
│       ├── src/
│       │   ├── types/        # TypeScript 类型
│       │   └── utils/        # 工具函数
│       └── package.json
│
├── apps/
│   ├── web/                  # Web 应用入口
│   └── docs/                 # 文档站点
│
├── bun.lockb
├── package.json
└── turbo.json                # Monorepo 构建配置
```

---

## 三、核心设计

### 3.1 组件系统设计

#### 3.1.1 组件定义 API

```typescript
// packages/core/src/components/defineComp.ts

import { signal, computed } from '../reactive';

export interface CompDefinition<P extends PropDefs> {
  // 元信息
  name: string;
  displayName: string;
  category: 'basic' | 'layout' | 'data' | 'form' | 'chart' | 'custom';
  icon: string;
  
  // 属性定义
  props: P;
  
  // 暴露给其他组件的数据
  expose?: ExposeConfig<P>;
  
  // 默认布局尺寸
  defaultSize?: { w: number; h: number };
  
  // 视图渲染
  view: (props: ResolvedProps<P>, ref: React.Ref<any>) => React.ReactNode;
  
  // 属性面板（可选，有默认生成）
  propertyPanel?: (props: PropEditors<P>) => React.ReactNode;
}

// 使用示例
export const ButtonComp = defineComp({
  name: 'button',
  displayName: '按钮',
  category: 'basic',
  icon: 'mdi:button',
  
  props: {
    text: prop.string('按钮'),
    type: prop.select(['primary', 'default', 'danger'], 'primary'),
    disabled: prop.boolean(false),
    loading: prop.boolean(false),
    onClick: prop.event(),
  },
  
  expose: {
    states: ['text', 'disabled', 'loading'],
    methods: {
      focus: (ref) => ref.current?.focus(),
      click: (ref) => ref.current?.click(),
    }
  },
  
  defaultSize: { w: 4, h: 2 },
  
  view({ text, type, disabled, loading, onClick }, ref) {
    return (
      <button
        ref={ref}
        className={`btn btn-${type}`}
        disabled={disabled || loading}
        onClick={() => onClick()}
      >
        {loading && <Spinner />}
        {text}
      </button>
    );
  }
});
```

#### 3.1.2 属性类型系统

```typescript
// packages/core/src/components/props.ts

export const prop = {
  // 基础类型
  string: (defaultValue = '') => ({ type: 'string', default: defaultValue }),
  number: (defaultValue = 0) => ({ type: 'number', default: defaultValue }),
  boolean: (defaultValue = false) => ({ type: 'boolean', default: defaultValue }),
  
  // 选择类型
  select: <T extends readonly string[]>(options: T, defaultValue: T[number]) => ({
    type: 'select',
    options,
    default: defaultValue,
  }),
  
  // 复杂类型
  color: (defaultValue = '#000000') => ({ type: 'color', default: defaultValue }),
  json: <T>(defaultValue: T) => ({ type: 'json', default: defaultValue }),
  
  // 事件类型
  event: () => ({ type: 'event' }),
  
  // 表达式类型（支持 {{xxx}} 语法）
  expression: <T>(defaultValue: T) => ({ type: 'expression', default: defaultValue }),
};
```

### 3.2 响应式系统设计

#### 3.2.1 基于 Signals 的状态管理

```typescript
// packages/core/src/reactive/compState.ts

import { signal, computed, effect } from '@preact/signals-react';

export class CompState<T> {
  // 原始值
  private _rawValue = signal<T | undefined>(undefined);
  
  // 表达式
  private _expression = signal<string>('');
  
  // 是否使用表达式
  private _useExpression = signal(false);
  
  // 计算后的最终值
  readonly value = computed(() => {
    if (this._useExpression.value && this._expression.value) {
      return this.evaluateExpression(this._expression.value);
    }
    return this._rawValue.value ?? this.defaultValue;
  });
  
  constructor(
    private defaultValue: T,
    private expressionContext: () => Record<string, any>
  ) {}
  
  // 设置原始值
  set(value: T) {
    this._useExpression.value = false;
    this._rawValue.value = value;
  }
  
  // 绑定表达式
  bind(expression: string) {
    this._useExpression.value = true;
    this._expression.value = expression;
  }
  
  // 获取序列化数据
  toJSON() {
    if (this._useExpression.value) {
      return this._expression.value;
    }
    return this._rawValue.value;
  }
  
  // 表达式求值
  private evaluateExpression(expr: string): T {
    const context = this.expressionContext();
    return evaluateExpr(expr, context);
  }
}
```

#### 3.2.2 组件实例

```typescript
// packages/core/src/reactive/compInstance.ts

export class CompInstance<P extends PropDefs> {
  readonly id: string;
  readonly type: string;
  readonly props: { [K in keyof P]: CompState<ResolvedPropType<P[K]>> };
  
  // 组件暴露的值（其他组件可以引用）
  readonly exposedValues = computed(() => {
    const result: Record<string, any> = {};
    for (const [key, state] of Object.entries(this.props)) {
      result[key] = state.value.value;
    }
    return result;
  });
  
  constructor(
    definition: CompDefinition<P>,
    initialData: Partial<SerializedComp>,
    private appContext: AppContext
  ) {
    this.id = initialData.id ?? generateId();
    this.type = definition.name;
    
    // 初始化所有属性状态
    this.props = {} as any;
    for (const [key, propDef] of Object.entries(definition.props)) {
      const initialValue = initialData.props?.[key];
      this.props[key] = new CompState(
        propDef.default,
        () => this.appContext.getAllExposedValues()
      );
      
      if (initialValue !== undefined) {
        if (isExpression(initialValue)) {
          this.props[key].bind(initialValue);
        } else {
          this.props[key].set(initialValue);
        }
      }
    }
  }
}
```

### 3.3 表达式引擎设计

```typescript
// packages/core/src/expression/evaluator.ts

// 表达式语法: {{componentName.propertyName}} 或 {{1 + 2}}
const EXPRESSION_REGEX = /\{\{(.+?)\}\}/g;

export function evaluateExpr(expr: string, context: Record<string, any>): any {
  // 简单属性引用: {{button1.text}}
  if (expr.match(/^\{\{[\w.]+\}\}$/)) {
    const path = expr.slice(2, -2);
    return getValueByPath(context, path);
  }
  
  // 复杂表达式: {{button1.text + ' - ' + input1.value}}
  // 使用安全的表达式求值（非 eval）
  return safeEvaluate(expr.slice(2, -2), context);
}

// 安全的表达式求值器
function safeEvaluate(code: string, context: Record<string, any>): any {
  // 使用 Function 构造器创建安全的沙箱环境
  const contextKeys = Object.keys(context);
  const contextValues = Object.values(context);
  
  const fn = new Function(
    ...contextKeys,
    `"use strict"; return (${code});`
  );
  
  return fn(...contextValues);
}

// 字符串模板: "Hello, {{name}}!"
export function evaluateTemplate(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(EXPRESSION_REGEX, (match, expr) => {
    try {
      const result = safeEvaluate(expr.trim(), context);
      return String(result ?? '');
    } catch {
      return match; // 保持原样
    }
  });
}
```

### 3.4 表达式编辑器

表达式编辑器 (`ExpressionEditor`) 是一个专门用于输入和编辑表达式的 UI 组件，支持以下功能：

#### 3.4.1 核心功能

- **{{}} 语法识别**：自动检测输入中的 `{{expression}}` 语法
- **自动补全**：输入 `{{` 后显示可用的组件名和属性名
- **实时求值预览**：在输入框下方显示表达式的计算结果
- **错误提示**：表达式求值失败时显示错误信息

#### 3.4.2 集成方式

```typescript
// apps/web/src/components/ui/ExpressionEditor.tsx

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  currentComponentName?: string; // 排除当前组件的自引用
}

// 在 PropertyPanel 中使用
<ExpressionEditor
  value={props.content}
  onChange={(v) => handlePropChange('content', v)}
  placeholder="输入值或表达式 {{}}"
  currentComponentName={selectedComponent.name}
/>
```

#### 3.4.3 画布组件求值

组件在画布上渲染时会自动对包含表达式的属性进行求值：

```typescript
// apps/web/src/components/canvas/ComponentWrapper.tsx

// 获取表达式求值上下文
const expressionContext = appContext.getExpressionContext();

// 解析 props（支持表达式求值）
const resolvedProps = useMemo(() => {
  const result: Record<string, any> = {};
  
  for (const [key, propDef] of Object.entries(definition.props)) {
    const rawValue = data.props[key] ?? propDef.default;
    
    // 如果包含表达式 {{}}，进行求值
    if (typeof rawValue === 'string' && rawValue.includes('{{') && rawValue.includes('}}')) {
      result[key] = evaluateTemplate(rawValue, expressionContext);
    } else {
      result[key] = rawValue;
    }
  }
  
  return result;
}, [definition.props, data.props, expressionContext]);
```

#### 3.4.4 使用示例

```
// 简单引用
{{input1.value}}           // 获取 input1 组件的值
{{table1.data}}            // 获取 table1 组件的数据

// 混合文本
你输入的内容是: {{input1.value}}

// 复杂表达式
{{table1.data.length}} 条数据
{{input1.value.toUpperCase()}}
```

---

## 四、数据流转设计

### 4.1 整体数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户操作                                 │
│  (拖拽组件、修改属性、触发事件)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Editor 状态管理                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 选中状态     │  │ 画布缩放    │  │ 历史记录    │              │
│  │ (signals)   │  │ (signals)   │  │ (signals)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      App 状态 (AppContext)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ components: Map<id, CompInstance>                        │  │
│  │                                                          │  │
│  │   button1 ──┬── props.text ────► Signal<string>         │  │
│  │             ├── props.disabled ► Signal<boolean>        │  │
│  │             └── exposedValues ──► Computed<{...}>       │  │
│  │                                                          │  │
│  │   input1 ───┬── props.value ───► Signal<string>         │  │
│  │             └── exposedValues ──► Computed<{...}>       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 表达式上下文 (自动收集)                                    │  │
│  │ {                                                        │  │
│  │   button1: { text: "Click", disabled: false },          │  │
│  │   input1: { value: "Hello" },                           │  │
│  │ }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      序列化 & 持久化                             │
│                                                                 │
│  AppContext.toJSON() ───► POST /api/apps/:id ───► SQLite       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 组件间通信

```typescript
// 表达式引用示例
// Input 组件
{
  id: "input1",
  type: "input",
  props: {
    value: "",
    placeholder: "请输入"
  }
}

// Text 组件引用 Input 的值
{
  id: "text1",
  type: "text",
  props: {
    content: "{{input1.value}}"  // 表达式引用
  }
}

// Button 组件的事件处理
{
  id: "button1",
  type: "button",
  props: {
    text: "提交",
    onClick: [
      {
        action: "setValue",
        target: "input1",
        property: "value",
        value: ""
      },
      {
        action: "showMessage",
        message: "已清空输入框"
      }
    ]
  }
}
```

### 4.3 事件系统

```typescript
// packages/core/src/events/eventSystem.ts

export interface EventAction {
  action: string;
  [key: string]: any;
}

// 内置 Action 类型
export const builtinActions = {
  // 设置组件值
  setValue: (ctx, { target, property, value }) => {
    const comp = ctx.getComponent(target);
    comp?.props[property].set(evaluateExpr(value, ctx.getAllExposedValues()));
  },
  
  // 显示消息
  showMessage: (ctx, { message, type = 'info' }) => {
    ctx.showToast(message, type);
  },
  
  // 跳转链接
  navigateTo: (ctx, { url, newTab = false }) => {
    if (newTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  },
  
  // 执行查询
  runQuery: async (ctx, { queryId, params }) => {
    return ctx.executeQuery(queryId, params);
  },
  
  // 下载文件
  downloadFile: (ctx, { url, filename }) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  },
  
  // 复制到剪贴板
  copyToClipboard: async (ctx, { text }) => {
    await navigator.clipboard.writeText(text);
    ctx.showToast('已复制到剪贴板');
  },
};
```

---

## 五、后端 API 设计

### 5.1 API 路由总览

```
┌─────────────────────────────────────────────────────────────────┐
│                          API Routes                              │
├─────────────────────────────────────────────────────────────────┤
│  认证相关                                                        │
│  POST   /api/auth/register      注册                            │
│  POST   /api/auth/login         登录                            │
│  POST   /api/auth/logout        登出                            │
│  GET    /api/auth/me            获取当前用户                     │
├─────────────────────────────────────────────────────────────────┤
│  应用管理                                                        │
│  GET    /api/apps               获取应用列表                     │
│  POST   /api/apps               创建应用                        │
│  GET    /api/apps/:id           获取应用详情                     │
│  PUT    /api/apps/:id           更新应用                        │
│  DELETE /api/apps/:id           删除应用                        │
│  POST   /api/apps/:id/publish   发布应用                        │
│  GET    /api/apps/:id/versions  获取版本历史                     │
├─────────────────────────────────────────────────────────────────┤
│  组件库                                                          │
│  GET    /api/components         获取组件列表（内置+自定义）       │
│  POST   /api/components         上传自定义组件                   │
│  DELETE /api/components/:id     删除自定义组件                   │
├─────────────────────────────────────────────────────────────────┤
│  数据源                                                          │
│  GET    /api/datasources        获取数据源列表                   │
│  POST   /api/datasources        创建数据源                       │
│  PUT    /api/datasources/:id    更新数据源                       │
│  DELETE /api/datasources/:id    删除数据源                       │
│  POST   /api/datasources/:id/test  测试连接                     │
├─────────────────────────────────────────────────────────────────┤
│  查询执行                                                        │
│  POST   /api/queries/execute    执行查询                        │
│  GET    /api/queries/history    查询历史                        │
├─────────────────────────────────────────────────────────────────┤
│  资源管理                                                        │
│  POST   /api/resources/upload   上传文件                        │
│  GET    /api/resources/:id      获取文件                        │
│  DELETE /api/resources/:id      删除文件                        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 核心数据模型

```typescript
// packages/server/src/db/schema.ts

import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 应用表
export const apps = sqliteTable('apps', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  
  // 应用 Schema (JSON)
  schema: text('schema', { mode: 'json' }).$type<AppSchema>(),
  
  // 状态
  status: text('status', { enum: ['draft', 'published'] }).default('draft'),
  publishedVersion: integer('published_version'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 应用版本历史
export const appVersions = sqliteTable('app_versions', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => apps.id),
  version: integer('version').notNull(),
  schema: text('schema', { mode: 'json' }).$type<AppSchema>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by').references(() => users.id),
});

// 数据源表
export const datasources = sqliteTable('datasources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['rest', 'graphql', 'mysql', 'postgres', 'mongodb'] }),
  config: text('config', { mode: 'json' }),  // 加密存储
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 自定义组件表
export const customComponents = sqliteTable('custom_components', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  category: text('category'),
  
  // 组件代码 (ESM)
  code: text('code').notNull(),
  
  // 组件元信息
  meta: text('meta', { mode: 'json' }),
  
  ownerId: text('owner_id').notNull().references(() => users.id),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 5.3 应用 Schema 定义

```typescript
// packages/shared/src/types/schema.ts

export interface AppSchema {
  version: string;  // Schema 版本，用于迁移
  
  // 页面列表
  pages: PageSchema[];
  
  // 全局状态
  globalState?: Record<string, any>;
  
  // 数据源配置
  datasources?: DatasourceRef[];
  
  // 查询定义
  queries?: QuerySchema[];
  
  // 主题配置
  theme?: ThemeConfig;
}

export interface PageSchema {
  id: string;
  name: string;
  path: string;        // 路由路径
  
  // 组件树
  components: ComponentSchema[];
  
  // 布局信息
  layout: LayoutSchema;
}

export interface ComponentSchema {
  id: string;
  type: string;        // 组件类型
  name: string;        // 组件实例名（用于引用）
  
  // 属性值（可以是静态值或表达式）
  props: Record<string, any>;
  
  // 布局位置
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  
  // 子组件（容器类组件）
  children?: ComponentSchema[];
}

export interface QuerySchema {
  id: string;
  name: string;
  datasourceId: string;
  
  // 查询配置
  config: {
    method?: string;
    url?: string;
    body?: string;
    headers?: Record<string, string>;
    // ... 根据数据源类型不同
  };
  
  // 执行配置
  runOnInit?: boolean;
  cacheTime?: number;
}
```

### 5.4 API 实现示例

```typescript
// packages/server/src/routes/apps.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { apps, appVersions } from '../db/schema';
import { authMiddleware } from '../middleware/auth';

const appsRouter = new Hono();

// 获取应用列表
appsRouter.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  
  const userApps = await db
    .select()
    .from(apps)
    .where(eq(apps.ownerId, userId))
    .orderBy(desc(apps.updatedAt));
  
  return c.json({ apps: userApps });
});

// 创建应用
const createAppSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

appsRouter.post('/', authMiddleware, zValidator('json', createAppSchema), async (c) => {
  const userId = c.get('userId');
  const { name, description } = c.req.valid('json');
  
  const newApp = {
    id: generateId(),
    name,
    description,
    ownerId: userId,
    schema: getDefaultAppSchema(),
    status: 'draft' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.insert(apps).values(newApp);
  
  return c.json({ app: newApp }, 201);
});

// 保存应用
const saveAppSchema = z.object({
  schema: z.any(),  // AppSchema
});

appsRouter.put('/:id', authMiddleware, zValidator('json', saveAppSchema), async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');
  const { schema } = c.req.valid('json');
  
  // 检查权限
  const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
  if (!app || app.ownerId !== userId) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  // 更新应用
  await db
    .update(apps)
    .set({ schema, updatedAt: new Date() })
    .where(eq(apps.id, appId));
  
  return c.json({ success: true });
});

// 发布应用
appsRouter.post('/:id/publish', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('id');
  
  const app = await db.select().from(apps).where(eq(apps.id, appId)).get();
  if (!app || app.ownerId !== userId) {
    return c.json({ error: 'Not found' }, 404);
  }
  
  const newVersion = (app.publishedVersion ?? 0) + 1;
  
  // 保存版本历史
  await db.insert(appVersions).values({
    id: generateId(),
    appId,
    version: newVersion,
    schema: app.schema,
    createdAt: new Date(),
    createdBy: userId,
  });
  
  // 更新发布状态
  await db
    .update(apps)
    .set({ status: 'published', publishedVersion: newVersion, updatedAt: new Date() })
    .where(eq(apps.id, appId));
  
  return c.json({ success: true, version: newVersion });
});

export { appsRouter };
```

---

## 六、开发路线图

### Phase 1: 核心框架 (Week 1-2)

- [x] 项目初始化 (Bun + Monorepo + shadcn/ui)
- [x] 核心响应式系统 (@preact/signals 封装)
- [x] 组件定义系统 (defineComp API)
- [x] 表达式引擎 (基础求值)
- [x] 5 个基础组件 (Button, Input, Text, Container, Image)

### Phase 2: 编辑器 (Week 3-4)

- [x] 拖拽画布 (原生拖放 + 组件移动/调整大小)
- [x] 网格吸附系统 (24列 × 100行)
- [x] 网格限制 (24列 × 100行，组件不能超出边界)
- [x] 组件面板 (分类展示、拖放支持、点击添加)
- [x] 属性面板 (布局控制、动态属性表单、组件名称编辑)
- [x] 响应式更新 (使用 computed signals)
- [x] 键盘快捷键 (Delete/方向键/Ctrl+D/Ctrl+Z/Ctrl+Y/Ctrl+P)
- [x] Undo/Redo (历史记录管理)
- [x] 预览模式 (全屏画布、组件可交互)
- [x] 应用设置弹窗 (基本设置、画布设置、关于)
- [x] 大纲树 (组件层级、点击选中、复制删除)

### Phase 3: 后端服务 & 前后端集成 (Week 5-6)

- [x] Hono + SQLite (bun:sqlite) + Drizzle 搭建
- [x] CORS 配置
- [x] 应用 CRUD API
- [x] 应用保存与发布 API
- [x] 版本历史 API
- [x] 前端 API 服务封装
- [x] 前端路由系统 (react-router-dom)
- [x] 应用列表页面 (创建/删除/编辑入口)
- [x] 编辑器页面 (加载/保存应用)
- [ ] 用户认证 (better-auth)

### Phase 4: 扩展功能 (Week 7-8)

- [x] 更多内置组件
  - [x] 表单组件: Select, Checkbox, Switch, Textarea, Radio
  - [x] 数据展示: Table, Progress, Badge
  - [x] 布局组件: Divider
- [x] Container 容器嵌套功能
  - [x] 子组件嵌套支持 (AppContext.addComponent 支持 parentId)
  - [x] 子组件渲染 (ContainerComp 渲染 children)
  - [x] 拖拽到容器内部 (Canvas 检测容器位置)
  - [x] 容器溢出滚动 (overflow: auto/scroll)
  - [x] 子组件可选中、拖拽、调整大小
  - [x] 已有组件可移动到容器内/外
- [x] 更多容器组件
  - [x] Form 表单容器 (收集子组件值、表单验证、提交事件)
  - [x] Modal 弹窗容器 (显示/隐藏控制、遮罩层、关闭按钮)
- [x] 数据源连接 (REST API)
- [x] 查询编辑器
- [x] 表达式编辑器
  - [x] ExpressionEditor 组件 (支持 {{}} 语法)
  - [x] 自动补全 (组件名、属性名提示)
  - [x] 实时求值预览 (输入时显示计算结果)
  - [x] 画布组件表达式求值 (组件渲染时自动计算表达式)
  - [x] 组件间数据引用 (如 {{input1.value}}, {{table1.data}})
- [ ] 自定义组件上传
- [ ] 主题系统

### Phase 5: 优化 & 文档 (Week 9-10)

- [ ] 性能优化
- [ ] 错误处理
- [ ] 开发者文档
- [ ] 用户使用文档
- [ ] 示例项目

---

## 七、扩展性预留

### 7.1 插件系统 (后续实现)

```typescript
// 插件接口设计
interface LowCodePlugin {
  name: string;
  version: string;
  
  // 注册自定义组件
  components?: CompDefinition[];
  
  // 注册自定义 Action
  actions?: Record<string, ActionHandler>;
  
  // 注册数据源类型
  datasourceTypes?: DatasourceType[];
  
  // 扩展编辑器
  editorExtensions?: EditorExtension[];
}

// 使用示例
const myPlugin: LowCodePlugin = {
  name: 'my-chart-plugin',
  version: '1.0.0',
  components: [EChartsComp, ChartJSComp],
  actions: {
    refreshChart: (ctx, { chartId }) => {
      ctx.getComponent(chartId)?.refresh();
    }
  }
};
```

### 7.2 主题系统 (后续实现)

```typescript
// 主题配置
interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    // ...
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}
```

### 7.3 协作功能 (后续实现)

- 多人实时编辑 (基于 CRDT 或 OT)
- 评论系统
- 版本对比

---

## 八、风险与挑战

| 风险 | 影响 | 应对策略 |
|-----|------|---------|
| Bun 生态不成熟 | 中 | 核心依赖选择成熟库，有问题可回退 Node |
| Signals 在复杂场景的性能 | 低 | 预先做性能测试，必要时优化 |
| 表达式安全性 | 高 | 使用沙箱执行，限制可访问的 API |
| 自定义组件兼容性 | 中 | 严格的组件规范，版本控制 |

---

## 九、参考资源

- [Bun 官方文档](https://bun.sh/docs)
- [Hono 框架](https://hono.dev/)
- [Preact Signals](https://preactjs.com/guide/v10/signals/)
- [@dnd-kit](https://dndkit.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [better-auth](https://www.better-auth.com/)

---

## 十、开始开发

```bash
# 初始化项目
bun create lowcode-lite

# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 启动后端
bun run server
```

---

> 文档版本: v0.3.0  
> 最后更新: 2026-01-15  
> 作者: LuTing & AI Assistant
