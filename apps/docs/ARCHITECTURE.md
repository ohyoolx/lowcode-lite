# Lowcode-Lite 架构文档

本文档描述 Lowcode-Lite 项目的整体架构设计和模块划分。

## 目录

- [项目结构](#项目结构)
- [Monorepo 包说明](#monorepo-包说明)
- [核心模块关系](#核心模块关系)
- [响应式系统](#响应式系统)
- [表达式系统](#表达式系统)
- [组件系统](#组件系统)
- [数据源系统](#数据源系统)

---

## 项目结构

```
lowcode-lite/
├── apps/
│   ├── web/                    # 前端编辑器应用
│   │   ├── src/
│   │   │   ├── api/           # API 请求封装
│   │   │   ├── components/    # React 组件
│   │   │   │   ├── canvas/    # 画布相关
│   │   │   │   ├── dialogs/   # 对话框
│   │   │   │   ├── layout/    # 布局组件
│   │   │   │   ├── panels/    # 面板组件
│   │   │   │   └── ui/        # 通用 UI 组件
│   │   │   ├── context/       # React Context
│   │   │   ├── hooks/         # 自定义 Hooks
│   │   │   ├── pages/         # 页面组件
│   │   │   └── utils/         # 工具函数
│   │   └── ...
│   └── docs/                   # 文档
│
├── packages/
│   ├── core/                   # 核心运行时
│   │   ├── src/
│   │   │   ├── components/    # 组件实例管理
│   │   │   ├── datasource/    # 数据源管理
│   │   │   ├── expression/    # 表达式引擎
│   │   │   └── reactive/      # 响应式系统
│   │   └── ...
│   │
│   ├── components/             # 内置组件库
│   │   ├── src/
│   │   │   ├── basic/         # 基础组件
│   │   │   ├── data/          # 数据展示组件
│   │   │   ├── form/          # 表单组件
│   │   │   └── layout/        # 布局组件
│   │   └── ...
│   │
│   ├── shared/                 # 共享类型和工具
│   │   ├── src/
│   │   │   ├── types/         # TypeScript 类型定义
│   │   │   └── utils/         # 工具函数
│   │   └── ...
│   │
│   ├── ui/                     # 基础 UI 组件库
│   │   ├── src/
│   │   │   ├── components/    # 通用 UI 组件
│   │   │   └── utils/         # UI 工具函数
│   │   └── ...
│   │
│   └── server/                 # 后端服务
│       ├── src/
│       │   ├── db/            # 数据库相关
│       │   └── routes/        # API 路由
│       └── ...
│
└── ...
```

---

## Monorepo 包说明

### @lowcode-lite/core

核心运行时包，不依赖 React DOM，可在多端复用。

| 模块 | 文件 | 职责 |
|------|------|------|
| reactive | `signals.ts` | @preact/signals 的封装 |
| reactive | `appContext.ts` | 应用上下文管理 |
| reactive | `compState.ts` | 组件状态管理 |
| components | `defineComp.ts` | 组件定义 API |
| components | `compInstance.ts` | 组件实例类 |
| components | `registry.ts` | 组件注册表 |
| expression | `evaluator.ts` | 表达式求值器 |
| expression | `sandbox.ts` | 安全沙箱 |
| datasource | `queryManager.ts` | 查询管理器 |
| datasource | `httpClient.ts` | HTTP 客户端 |
| datasource | `tempStateManager.ts` | 临时状态管理器 |
| datasource | `transformerManager.ts` | 转换器管理器 |
| datasource | `dataResponderManager.ts` | 数据响应器管理器 |

### @lowcode-lite/components

内置组件库，使用 `defineComp` API 定义。

| 分类 | 组件 | 说明 |
|------|------|------|
| basic | Button, Input, Text, Image, Container | 基础组件 |
| layout | Divider, Form, Modal | 布局组件 |
| data | Table, Badge, Progress | 数据展示 |
| form | Checkbox, Radio, Select, Switch, Textarea | 表单控件 |

### @lowcode-lite/shared

共享类型定义和工具函数。

| 模块 | 说明 |
|------|------|
| types/schema.ts | AppData, PageData, ComponentData 等 |
| types/component.ts | CompDefinition, PropDefinition 等 |
| types/query.ts | QueryDefinition, RestApiConfig 等 |
| types/tempState.ts | TempStateDefinition, TempStateExposedValues 等 |
| types/transformer.ts | TransformerDefinition, TransformerExposedValues 等 |
| types/dataResponder.ts | DataResponderDefinition, DataResponderExposedValues 等 |
| utils/id.ts | ID 生成函数 |
| utils/path.ts | 路径处理函数 |

### @lowcode-lite/ui

基础 UI 组件库，基于 Radix UI + Tailwind CSS。

- Button, Input, Select, Checkbox, Switch
- Table, Card, Dialog, Badge, Progress
- 样式工具函数 `cn()`

### @lowcode-lite/server

后端服务，基于 Hono + Drizzle ORM + SQLite。

| 模块 | 说明 |
|------|------|
| db/schema.ts | 数据库表定义 |
| routes/apps.ts | 应用 CRUD API |
| routes/health.ts | 健康检查 |

---

## 核心模块关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/web (编辑器)                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │    Canvas     │  │  PropertyPanel│  │  QueryPanel   │        │
│  │   (画布渲染)   │  │  (属性编辑)   │  │  (查询编辑)   │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│           │                  │                  │                │
│           └──────────────────┼──────────────────┘                │
│                              ▼                                   │
│                    ┌───────────────────┐                         │
│                    │   AppContext      │                         │
│                    │   (React Context) │                         │
│                    └───────────────────┘                         │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    packages/core (核心运行时)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      AppContext                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │   Schema    │  │ Components  │  │   Queries   │  │ TempStates │ │  │
│  │  │  (Signal)   │  │    Map      │  │   Manager   │  │  Manager   │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │  │
│  │         │                │                │                │  │
│  │         └────────────────┼────────────────┘                │  │
│  │                          ▼                                 │  │
│  │                  ┌─────────────────┐                       │  │
│  │                  │  exposedValues  │                       │  │
│  │                  │    (Signal)     │                       │  │
│  │                  └─────────────────┘                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Expression Engine                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ evaluator   │  │  sandbox    │  │   utils     │        │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  packages/components (组件库)                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   ButtonComp  │  │   TableComp   │  │   ModalComp   │  ...   │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     packages/ui (UI 组件)                        │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │    Button     │  │    Table      │  │    Dialog     │  ...   │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 响应式系统

### 技术选型

使用 `@preact/signals-react` 作为响应式基础设施：

- 细粒度更新，性能优于 Context
- 自动依赖追踪
- 与 React 无缝集成

### 核心 Signal

```typescript
// packages/core/src/reactive/signals.ts
export { 
  signal,      // 创建可变信号
  computed,    // 创建计算信号
  effect,      // 副作用
  batch,       // 批量更新
} from '@preact/signals-react';
```

### 使用模式

```typescript
// 1. 创建 Signal
const count = signal(0);

// 2. 读取值（自动追踪依赖）
console.log(count.value);

// 3. 更新值（自动触发更新）
count.value++;

// 4. 计算 Signal（自动更新）
const doubled = computed(() => count.value * 2);

// 5. 在 React 中使用
function Counter() {
  useSignals(); // 启用响应式追踪
  return <div>{count.value}</div>;
}
```

### AppContext 中的 Signal

```typescript
class AppContext {
  // Schema 存储
  private _schema: Signal<AppData>;
  
  // 当前页面
  private _currentPageId: Signal<string>;
  
  // 组件实例映射
  private _components: Signal<Map<string, CompInstance>>;
  
  // 计算所有暴露值（用于表达式）
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
}
```

---

## 表达式系统

### 语法

使用 `{{ expression }}` 语法：

```javascript
// 简单引用
{{input1.value}}

// 属性访问
{{table1.data.length}}

// 方法调用
{{input1.value.toUpperCase()}}

// 复杂表达式
{{items.filter(x => x.active).length}}

// 混合文本
共有 {{table1.data.length}} 条数据
```

### 求值流程

```
┌──────────────────┐
│ 输入: "{{...}}"  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ isExpression()   │ 检测是否为表达式
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ extractExpressions()│ 提取表达式内容
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ evaluateExpr()   │ 纯表达式求值
│ 或               │
│ evaluateTemplate()│ 模板字符串求值
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ evalInSandbox()  │ 沙箱执行
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 返回结果         │
└──────────────────┘
```

### 沙箱安全

```typescript
// packages/core/src/expression/sandbox.ts

// 白名单全局对象
const SAFE_GLOBALS = {
  Math, Date, String, Number, Boolean, Array, Object, JSON,
  parseInt, parseFloat, isNaN, isFinite,
  encodeURI, decodeURI, encodeURIComponent, decodeURIComponent,
  _,  // lodash
};

// 沙箱求值
function evalInSandbox(code: string, context: Record<string, any>): any {
  // 使用 Proxy 拦截危险操作
  // 限制可访问的全局对象
  // ...
}
```

### 依赖追踪

```typescript
// 获取表达式依赖的组件名
function getExpressionDependencies(expr: string): string[] {
  // 从 "{{button1.text + input1.value}}" 
  // 提取 ["button1", "input1"]
}
```

---

## 组件系统

### 定义组件

```typescript
// packages/core/src/components/defineComp.ts

export function defineComp<P extends PropDefs>(
  definition: CompDefinition<P>
): CompDefinition<P> {
  // 验证定义
  // 注册到全局注册表
  return definition;
}

// 属性定义辅助函数
export const prop = {
  string: (defaultValue = '') => ({ type: 'string', default: defaultValue }),
  number: (defaultValue = 0) => ({ type: 'number', default: defaultValue }),
  boolean: (defaultValue = false) => ({ type: 'boolean', default: defaultValue }),
  select: <T extends readonly string[]>(options: T, defaultValue: T[number]) => ({
    type: 'select', options, default: defaultValue
  }),
  color: (defaultValue = '#000000') => ({ type: 'color', default: defaultValue }),
  json: (defaultValue = {}) => ({ type: 'json', default: defaultValue }),
  event: () => ({ type: 'event', default: '' }),
};
```

### 组件注册表

```typescript
// packages/core/src/components/registry.ts

class ComponentRegistry {
  private _components = new Map<string, CompDefinition>();
  
  register(definition: CompDefinition): void;
  get(name: string): CompDefinition | undefined;
  getAll(): CompDefinition[];
  getByCategory(category: string): CompDefinition[];
}

export const componentRegistry = new ComponentRegistry();
```

### 组件实例

```typescript
// packages/core/src/components/compInstance.ts

class CompInstance<P extends PropDefs> {
  constructor(
    definition: CompDefinition<P>,
    data: ComponentData,
    appContext: AppContext
  ) {
    // 为每个属性创建 CompState
    for (const [key, propDef] of Object.entries(definition.props)) {
      this.props[key] = new CompState(
        propDef.default,
        appContext.exposedValues  // 传入表达式上下文
      );
    }
    
    // 计算暴露值
    this.exposedValues = computed(() => {
      // 收集所有属性值
      // 如果有 exposeComputed，应用转换
    });
  }
}
```

### 容器组件渲染

```
容器组件 (isContainer: true)
     │
     ├─ 接收 children 参数
     │
     └─ 递归渲染子组件
         │
         ├─ ComponentWrapper (子组件1)
         ├─ ComponentWrapper (子组件2)
         └─ ...

覆盖层组件 (isOverlay: true)
     │
     ├─ 不占用画布布局位置
     │
     └─ 渲染在覆盖层容器中
```

---

## 数据源系统

### 查询管理器

```typescript
// packages/core/src/datasource/queryManager.ts

class QueryManager {
  private _queries = new Map<string, QueryInstance>();
  
  // 添加/更新/删除查询
  addQuery(definition: QueryDefinition): QueryInstance;
  updateQuery(id: string, updates: Partial<QueryDefinition>): void;
  removeQuery(id: string): void;
  
  // 执行查询
  runQuery(idOrName: string, args?: Record<string, unknown>): Promise<QueryResult>;
  runInitQueries(): Promise<void>;
  
  // 暴露值（用于表达式）
  getAllExposedValues(): Record<string, QueryExposedValues>;
}
```

### HTTP 客户端

```typescript
// packages/core/src/datasource/httpClient.ts

class HttpClient {
  // 请求取消控制器
  private _abortControllers = new Map<string, AbortController>();
  
  // 执行 REST API 请求
  async executeRestApi<T>(
    config: RestApiConfig,
    queryId: string,
    evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown,
    context?: Record<string, unknown>
  ): Promise<QueryResult<T>>;
  
  // 取消请求
  cancel(queryId: string): void;
}
```

### 临时状态管理器

```typescript
// packages/core/src/datasource/tempStateManager.ts

class TempStateManager {
  private _states = new Map<string, TempStateInstance>();
  
  // 添加/更新/删除状态
  addState(definition: TempStateDefinition): TempStateInstance;
  updateState(id: string, updates: Partial<TempStateDefinition>): void;
  removeState(id: string): void;
  
  // 获取/设置值
  getValue(idOrName: string): unknown;
  setValue(idOrName: string, value: unknown): void;
  
  // 重置所有状态
  resetAll(): void;
  
  // 暴露值（用于表达式）
  getAllExposedValues(): Record<string, TempStateExposedValues>;
}
```

### TempState 实例

```typescript
class TempStateInstance<T = unknown> {
  readonly definition: TempStateDefinition;
  
  // 当前值
  get value(): T;
  
  // 设置值
  setValue(value: T): void;
  
  // 重置为初始值
  reset(): void;
  
  // 获取暴露的值
  getExposedValues(): TempStateExposedValues<T>;
}
```

### 转换器管理器

```typescript
// packages/core/src/datasource/transformerManager.ts

class TransformerManager {
  private _transformers = new Map<string, TransformerInstance>();
  
  // 添加/更新/删除转换器
  addTransformer(definition: TransformerDefinition): TransformerInstance;
  updateTransformer(id: string, updates: Partial<TransformerDefinition>): void;
  removeTransformer(id: string): void;
  
  // 重新计算所有转换器
  computeAll(): void;
  
  // 暴露值（用于表达式）
  getAllExposedValues(): Record<string, TransformerExposedValues>;
}
```

### Transformer 实例

```typescript
class TransformerInstance<T = unknown> {
  readonly definition: TransformerDefinition;
  
  // 当前状态
  get state(): TransformerState;
  
  // 计算后的值
  get value(): T | undefined;
  
  // 错误信息
  get error(): string | undefined;
  
  // 执行计算
  compute(): T | undefined;
  
  // 强制重新计算
  refresh(): void;
  
  // 获取暴露的值
  getExposedValues(): TransformerExposedValues<T>;
}
```

### 数据响应器管理器

```typescript
// packages/core/src/datasource/dataResponderManager.ts

class DataResponderManager {
  private _responders = new Map<string, DataResponderInstance>();
  
  // 添加/更新/删除响应器
  addResponder(definition: DataResponderDefinition): DataResponderInstance;
  updateResponder(id: string, updates: Partial<DataResponderDefinition>): void;
  removeResponder(id: string): void;
  
  // 启动/停止所有响应器
  startAll(): void;
  stopAll(): void;
  
  // 检查依赖变化并执行
  checkAll(): void;
  
  // 暴露值（用于表达式）
  getAllExposedValues(): Record<string, DataResponderExposedValues>;
}
```

### DataResponder 实例

```typescript
class DataResponderInstance {
  readonly definition: DataResponderDefinition;
  
  // 当前状态
  get state(): DataResponderState;
  
  // 执行次数
  get runCount(): number;
  
  // 启动/停止监听
  start(): void;
  stop(): void;
  
  // 手动触发执行
  trigger(): void;
  
  // 设置启用状态
  setEnabled(enabled: boolean): void;
  
  // 获取暴露的值
  getExposedValues(): DataResponderExposedValues;
}
```

### 查询执行流程

```
┌──────────────────┐
│  query.run()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 检查缓存         │
│ (cacheTime > 0)  │
└────────┬─────────┘
         │ 无缓存
         ▼
┌──────────────────┐
│ 设置 loading 状态│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 解析配置中的表达式│
│ (URL, headers等) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送 HTTP 请求   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 更新状态         │
│ (success/error)  │
│ 设置缓存         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 返回 QueryResult │
└──────────────────┘
```

---

## 编辑器核心组件

### Canvas（画布）

**文件**: `apps/web/src/components/canvas/Canvas.tsx`

职责：
- 渲染网格背景
- 处理组件拖放
- 管理组件选择
- 渲染普通组件和覆盖层组件

### ComponentWrapper（组件包装器）

**文件**: `apps/web/src/components/canvas/ComponentWrapper.tsx`

职责：
- 包装单个组件
- 处理组件拖拽移动
- 处理组件大小调整
- 显示选中状态
- 表达式求值

### PropertyPanel（属性面板）

**文件**: `apps/web/src/components/panels/PropertyPanel.tsx`

职责：
- 显示选中组件的属性
- 提供属性编辑器
- 支持表达式编辑

### ExpressionEditor（表达式编辑器）

**文件**: `apps/web/src/components/ui/ExpressionEditor.tsx`

职责：
- 表达式输入和编辑
- 自动补全（组件名、属性名）
- 实时预览求值结果

---

## 历史记录系统

```typescript
class HistoryManager {
  private _past: HistoryEntry[] = [];
  private _future: HistoryEntry[] = [];
  
  // 记录状态
  push(schema: AppData, description?: string): void;
  
  // 撤销/重做
  undo(currentSchema: AppData): AppData | null;
  redo(currentSchema: AppData): AppData | null;
  
  // 状态 Signal
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;
}
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Cmd/Ctrl + Z | 撤销 |
| Cmd/Ctrl + Shift + Z | 重做 |
| Cmd/Ctrl + S | 保存 |
| Cmd/Ctrl + C | 复制组件 |
| Cmd/Ctrl + V | 粘贴组件 |
| Cmd/Ctrl + D | 快速复制 |
| Delete/Backspace | 删除组件 |
| Arrow Keys | 移动组件 |
| Escape | 取消选择 |

---

## 技术栈总结

| 层级 | 技术 |
|------|------|
| 包管理 | Bun + Turborepo |
| 前端框架 | React 18 |
| 响应式 | @preact/signals-react |
| 样式 | Tailwind CSS + tailwind-merge |
| UI 组件 | Radix UI |
| 路由 | React Router v6 |
| 后端框架 | Hono |
| 数据库 | SQLite + Drizzle ORM |
| 验证 | Zod |
| 构建 | Vite |
| 类型 | TypeScript |

---

> 文档版本: v1.0.0  
> 最后更新: 2026-01-16  
> 作者: AI Assistant
