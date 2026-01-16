# Lowcode-Lite Schema 文档

本文档详细描述 Lowcode-Lite 项目的核心数据结构（Schema），帮助开发者理解应用的数据组织方式。

## 目录

- [整体架构](#整体架构)
- [应用 Schema (AppData)](#应用-schema-appdata)
- [页面 Schema (PageData)](#页面-schema-pagedata)
- [组件 Schema (ComponentData)](#组件-schema-componentdata)
- [查询 Schema (QueryDefinition)](#查询-schema-querydefinition)
- [组件定义 (CompDefinition)](#组件定义-compdefinition)
- [运行时数据结构](#运行时数据结构)
- [数据流转图](#数据流转图)

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        AppData                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ version: "1.0.0"                                         ││
│  │ globalState: {}                                          ││
│  │ theme: {}                                                ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                      pages[]                             ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │ PageData                                             │││
│  │  │  - id, name, path                                    │││
│  │  │  ┌─────────────────────────────────────────────────┐│││
│  │  │  │              components[]                        ││││
│  │  │  │   ┌─────────────┐  ┌─────────────┐              ││││
│  │  │  │   │ComponentData│  │ComponentData│  ...         ││││
│  │  │  │   │  (嵌套)     │  │             │              ││││
│  │  │  │   └─────────────┘  └─────────────┘              ││││
│  │  │  └─────────────────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────┘││
│  ├─────────────────────────────────────────────────────────┤│
│  │                      queries[]                           ││
│  │  ┌─────────────────┐  ┌─────────────────┐               ││
│  │  │ QueryDefinition │  │ QueryDefinition │  ...          ││
│  │  └─────────────────┘  └─────────────────┘               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 应用 Schema (AppData)

**位置**: `packages/shared/src/types/schema.ts`

应用的顶层数据结构，存储在数据库中的 `apps.schema` 字段。

```typescript
interface AppData {
  /** Schema 版本号，用于未来的数据迁移 */
  version: string;
  
  /** 页面列表 */
  pages: PageData[];
  
  /** 全局状态（可选），用于跨页面共享数据 */
  globalState?: Record<string, any>;
  
  /** 查询列表（可选） */
  queries?: QueryDefinition[];
  
  /** 临时状态列表（可选） */
  tempStates?: TempStateDefinition[];
  
  /** 转换器列表（可选） */
  transformers?: TransformerDefinition[];
  
  /** 数据响应器列表（可选） */
  dataResponders?: DataResponderDefinition[];
  
  /** 主题配置（可选） */
  theme?: Record<string, any>;
}
```

### 示例

```json
{
  "version": "1.0.0",
  "pages": [
    {
      "id": "page-1",
      "name": "首页",
      "path": "/",
      "components": [...]
    }
  ],
  "globalState": {},
  "queries": [
    {
      "id": "query-1",
      "name": "getUserList",
      "type": "restApi",
      "config": {...}
    }
  ],
  "tempStates": [
    {
      "id": "state-1",
      "name": "selectedItem",
      "initialValue": null
    }
  ],
  "transformers": [
    {
      "id": "transformer-1",
      "name": "filteredData",
      "code": "return query1.data.filter(x => x.active);",
      "enabled": true
    }
  ],
  "dataResponders": [
    {
      "id": "responder-1",
      "name": "onInputChange",
      "watch": ["input1.value"],
      "code": "query1.run();",
      "enabled": true
    }
  ],
  "theme": {}
}
```

### 默认值

```typescript
function createDefaultAppSchema(): AppData {
  return {
    version: '1.0.0',
    pages: [{
      id: 'page-1',
      name: '首页',
      path: '/',
      components: [],
    }],
    globalState: {},
    queries: [],
    tempStates: [],
    transformers: [],
    dataResponders: [],
    theme: {},
  };
}
```

---

## 页面 Schema (PageData)

**位置**: `packages/shared/src/types/schema.ts`

一个应用可以包含多个页面，每个页面有独立的组件树。

```typescript
interface PageData {
  /** 页面唯一标识 */
  id: string;
  
  /** 页面名称（显示用） */
  name: string;
  
  /** 页面路由路径 */
  path: string;
  
  /** 页面内的组件列表（顶层组件） */
  components: ComponentData[];
}
```

### 说明

- `id`: 使用 `generateId()` 生成，格式如 `page-1`、`page-abc123`
- `path`: 用于路由，如 `/`、`/dashboard`、`/users/:id`
- `components`: 只存储顶层组件，嵌套组件存储在父组件的 `children` 中

---

## 组件 Schema (ComponentData)

**位置**: `packages/shared/src/types/schema.ts`

组件是构成页面的基本单元，支持嵌套（容器组件可包含子组件）。

```typescript
interface ComponentData {
  /** 组件实例唯一标识 */
  id: string;
  
  /** 组件类型名称（对应注册的组件名） */
  type: string;
  
  /** 组件实例名称（用于表达式引用，如 button1, input1） */
  name: string;
  
  /** 组件属性值 */
  props: Record<string, any>;
  
  /** 组件在画布上的位置和尺寸 */
  position: Position;
  
  /** 子组件列表（仅容器组件使用） */
  children?: ComponentData[];
}

interface Position {
  /** 网格 X 坐标（列） */
  x: number;
  
  /** 网格 Y 坐标（行） */
  y: number;
  
  /** 网格宽度（占多少列） */
  w: number;
  
  /** 网格高度（占多少行） */
  h: number;
}
```

### 网格系统说明

画布使用 24 列网格系统：

| 常量 | 值 | 说明 |
|------|-----|------|
| `GRID_COLS` | 24 | 画布总列数 |
| `GRID_ROWS` | 100 | 画布总行数 |
| `ROW_HEIGHT` | 16 | 每行高度（像素） |
| `COLUMN_WIDTH` | ~40px | 每列宽度（动态计算） |
| `MIN_COMPONENT_WIDTH` | 2 | 组件最小宽度 |
| `MIN_COMPONENT_HEIGHT` | 2 | 组件最小高度 |

### 组件类型

当前支持的 `type` 值：

| 类型 | 显示名 | 分类 | 说明 |
|------|--------|------|------|
| `button` | 按钮 | basic | 可点击按钮 |
| `input` | 输入框 | basic | 文本输入 |
| `text` | 文本 | basic | 静态文本显示 |
| `image` | 图片 | basic | 图片展示 |
| `container` | 容器 | layout | 嵌套容器 |
| `divider` | 分隔线 | layout | 水平/垂直分隔 |
| `form` | 表单 | layout | 表单容器 |
| `modal` | 弹窗 | layout | 覆盖层弹窗 |
| `table` | 表格 | data | 数据表格 |
| `badge` | 徽标 | data | 状态标签 |
| `progress` | 进度条 | data | 进度显示 |
| `checkbox` | 复选框 | form | 多选控件 |
| `radio` | 单选框 | form | 单选控件 |
| `select` | 下拉选择 | form | 选项选择 |
| `switch` | 开关 | form | 布尔切换 |
| `textarea` | 文本域 | form | 多行输入 |

### Props 值类型

`props` 中的值支持两种形式：

1. **静态值**: 直接的 JavaScript 值
   ```json
   { "text": "点击我", "disabled": false }
   ```

2. **表达式**: 以 `{{` 开头和 `}}` 结尾的字符串
   ```json
   { "text": "{{input1.value}}", "disabled": "{{!form.valid}}" }
   ```

### 示例

```json
{
  "id": "comp_1705123456789",
  "type": "container",
  "name": "container1",
  "props": {
    "backgroundColor": "#ffffff",
    "borderColor": "#e5e7eb",
    "borderWidth": "1",
    "borderRadius": "md",
    "padding": "4",
    "shadow": "sm",
    "overflow": "auto"
  },
  "position": { "x": 0, "y": 0, "w": 12, "h": 10 },
  "children": [
    {
      "id": "comp_1705123456790",
      "type": "button",
      "name": "button1",
      "props": {
        "text": "提交",
        "variant": "default",
        "size": "default"
      },
      "position": { "x": 2, "y": 2, "w": 4, "h": 2 }
    }
  ]
}
```

---

## 查询 Schema (QueryDefinition)

**位置**: `packages/shared/src/types/query.ts`

查询用于从外部数据源获取数据，支持 REST API、GraphQL、JS 脚本等类型。

```typescript
interface QueryDefinition {
  /** 查询唯一标识 */
  id: string;
  
  /** 查询名称（用于表达式引用，如 query1.data） */
  name: string;
  
  /** 数据源类型 */
  type: 'restApi' | 'graphql' | 'js';
  
  /** 类型特定的配置 */
  config: RestApiConfig | Record<string, any>;
  
  /** 是否在应用初始化时自动执行 */
  runOnInit?: boolean;
  
  /** 缓存时间（毫秒），0 表示不缓存 */
  cacheTime?: number;
  
  /** 是否自动取消之前未完成的请求 */
  cancelPrevious?: boolean;
}
```

### REST API 配置

```typescript
interface RestApiConfig {
  /** HTTP 方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  
  /** 请求 URL（支持表达式） */
  url: string;
  
  /** URL 查询参数 */
  params: KeyValuePair[];
  
  /** 请求头 */
  headers: KeyValuePair[];
  
  /** Body 类型 */
  bodyType: 'none' | 'application/json' | 'text/plain' | 
            'application/x-www-form-urlencoded' | 'multipart/form-data';
  
  /** Body 内容（JSON 或纯文本） */
  body?: string;
  
  /** Form Data */
  formData?: KeyValuePair[];
  
  /** 超时时间（毫秒） */
  timeout?: number;
}

interface KeyValuePair {
  key: string;
  value: string;
  enabled?: boolean;
}
```

### 查询暴露的值

查询执行后，可通过表达式访问以下属性：

```typescript
interface QueryExposedValues<T> {
  /** 响应数据 */
  data: T | undefined;
  
  /** 是否正在加载 */
  isFetching: boolean;
  
  /** 当前状态 */
  state: 'idle' | 'loading' | 'success' | 'error';
  
  /** 错误信息 */
  error?: string;
  
  /** 最后运行时间（毫秒） */
  runTime?: number;
  
  /** 触发查询的方法 */
  run: (args?: Record<string, unknown>) => Promise<QueryResult<T>>;
}
```

### 示例

```json
{
  "id": "query_1705123456789",
  "name": "getUserList",
  "type": "restApi",
  "config": {
    "method": "GET",
    "url": "https://api.example.com/users",
    "params": [
      { "key": "page", "value": "1", "enabled": true },
      { "key": "limit", "value": "10", "enabled": true }
    ],
    "headers": [
      { "key": "Authorization", "value": "Bearer {{token}}", "enabled": true }
    ],
    "bodyType": "none",
    "timeout": 10000
  },
  "runOnInit": true,
  "cacheTime": 60000,
  "cancelPrevious": true
}
```

### 在表达式中使用

```javascript
// 获取查询数据
{{getUserList.data}}

// 检查加载状态
{{getUserList.isFetching ? '加载中...' : '加载完成'}}

// 数据长度
{{getUserList.data?.length ?? 0}}

// 手动触发查询（在事件中）
getUserList.run()
```

---

## 临时状态 Schema (TempStateDefinition)

**位置**: `packages/shared/src/types/tempState.ts`

临时状态（TempState）用于存储应用运行时的临时数据，类似于 React 的 `useState`，但可以在表达式中全局访问。

```typescript
interface TempStateDefinition {
  /** 状态唯一标识 */
  id: string;
  
  /** 状态名称（用于表达式引用，如 state1.value） */
  name: string;
  
  /** 初始值（支持任意 JSON 类型） */
  initialValue: any;
  
  /** 状态描述（可选） */
  description?: string;
}
```

### 临时状态暴露的值

```typescript
interface TempStateExposedValues<T> {
  /** 当前值 */
  value: T;
  
  /** 设置新值 */
  setValue: (value: T) => void;
  
  /** 重置为初始值 */
  reset: () => void;
}
```

### 示例

```json
{
  "id": "state_1705123456789",
  "name": "selectedItem",
  "initialValue": null,
  "description": "当前选中的列表项"
}
```

### 在表达式中使用

```javascript
// 读取当前值
{{selectedItem.value}}

// 设置值（在事件处理中）
selectedItem.setValue({ id: 1, name: 'Item 1' })

// 重置为初始值
selectedItem.reset()

// 条件判断
{{selectedItem.value ? '已选择' : '未选择'}}

// 与其他数据结合
{{table1.data.find(item => item.id === selectedItem.value?.id)?.name}}
```

### 使用场景

1. **存储用户选择**: 如表格选中行、下拉选择等
2. **控制 UI 状态**: 如弹窗开关、Tab 选中项
3. **跨组件共享数据**: 无需通过 props 传递
4. **临时计算结果**: 存储中间计算结果

---

## 转换器 Schema (TransformerDefinition)

**位置**: `packages/shared/src/types/transformer.ts`

转换器（Transformer）是纯 JavaScript 函数，用于转换和派生数据。它会自动追踪依赖并在依赖变化时重新计算。

```typescript
interface TransformerDefinition {
  /** 转换器唯一标识 */
  id: string;
  
  /** 转换器名称（用于表达式引用，如 transformer1.value） */
  name: string;
  
  /** JavaScript 代码（返回转换后的值） */
  code: string;
  
  /** 描述（可选） */
  description?: string;
  
  /** 是否启用（禁用后不会执行） */
  enabled: boolean;
}
```

### 转换器状态

```typescript
type TransformerState = 'idle' | 'computing' | 'success' | 'error';
```

### 转换器暴露的值

```typescript
interface TransformerExposedValues<T> {
  /** 计算后的值 */
  value: T;
  
  /** 当前状态 */
  state: TransformerState;
  
  /** 错误信息（如果执行失败） */
  error?: string;
  
  /** 最后计算时间（毫秒） */
  lastComputeTime?: number;
  
  /** 强制重新计算 */
  refresh: () => void;
}
```

### 示例

```json
{
  "id": "transformer_1705123456789",
  "name": "filteredUsers",
  "code": "// 过滤活跃用户\nconst users = getUserList.data ?? [];\nreturn users.filter(user => user.isActive);",
  "description": "过滤出活跃用户列表",
  "enabled": true
}
```

### 在表达式中使用

```javascript
// 读取计算结果
{{filteredUsers.value}}

// 获取过滤后的用户数量
{{filteredUsers.value?.length ?? 0}}

// 检查状态
{{filteredUsers.state === 'success' ? '计算完成' : '计算中...'}}

// 强制刷新（在事件中）
filteredUsers.refresh()

// 处理错误
{{filteredUsers.error ?? ''}}
```

### 使用场景

1. **数据过滤**: 根据条件筛选数据
2. **数据映射**: 将数据转换为不同格式
3. **聚合计算**: 统计、汇总数据
4. **复杂逻辑**: 实现复杂的业务逻辑

### 与临时状态的区别

| 特性 | TempState | Transformer |
|------|-----------|-------------|
| 用途 | 存储用户输入/交互状态 | 派生/转换数据 |
| 值来源 | 手动设置（setValue） | 自动计算（代码） |
| 可修改性 | 可随时修改 | 只读（自动计算） |
| 依赖追踪 | 无 | 自动追踪并重新计算 |

---

## 数据响应器 Schema (DataResponderDefinition)

**位置**: `packages/shared/src/types/dataResponder.ts`

数据响应器（DataResponder）用于监听数据变化并执行 JavaScript 代码，类似于 React 的 `useEffect`。

```typescript
interface DataResponderDefinition {
  /** 响应器唯一标识 */
  id: string;
  
  /** 响应器名称（用于标识和调试） */
  name: string;
  
  /** 监听的表达式（当这些表达式的值变化时触发） */
  watch: string[];
  
  /** 触发时执行的 JavaScript 代码 */
  code: string;
  
  /** 描述（可选） */
  description?: string;
  
  /** 是否启用（禁用后不会触发） */
  enabled: boolean;
  
  /** 是否在初始化时执行一次 */
  runOnInit: boolean;
  
  /** 防抖时间（毫秒，0 表示不防抖） */
  debounceMs: number;
}
```

### 响应器状态

```typescript
type DataResponderState = 'idle' | 'running' | 'success' | 'error';
```

### 响应器暴露的值

```typescript
interface DataResponderExposedValues {
  /** 当前状态 */
  state: DataResponderState;
  
  /** 最后一次执行的错误（如果有） */
  error?: string;
  
  /** 最后一次执行时间 */
  lastRunTime?: number;
  
  /** 执行次数 */
  runCount: number;
  
  /** 手动触发执行 */
  trigger: () => void;
  
  /** 启用/禁用 */
  setEnabled: (enabled: boolean) => void;
}
```

### 示例

```json
{
  "id": "responder_1705123456789",
  "name": "onSearchChange",
  "watch": ["searchInput.value"],
  "code": "// 当搜索框值变化时，重新执行查询\ngetUserList.run({ keyword: searchInput.value });",
  "description": "搜索框变化时触发查询",
  "enabled": true,
  "runOnInit": false,
  "debounceMs": 300
}
```

### 在表达式中使用

```javascript
// 手动触发执行（在事件中）
onSearchChange.trigger()

// 启用/禁用
onSearchChange.setEnabled(false)

// 获取执行次数
{{onSearchChange.runCount}}

// 检查状态
{{onSearchChange.state === 'running' ? '执行中...' : ''}}
```

### 使用场景

1. **联动查询**: 当输入框值变化时，自动刷新查询
2. **状态同步**: 当某个状态变化时，更新其他状态
3. **副作用执行**: 当数据满足条件时，执行某些操作
4. **日志记录**: 监听数据变化并记录日志

### 与其他数据类型的对比

| 特性 | TempState | Transformer | DataResponder |
|------|-----------|-------------|---------------|
| 用途 | 存储状态 | 派生数据 | 响应变化 |
| 返回值 | 有 | 有 | 无 |
| 自动执行 | 否 | 是 | 是（监听变化） |
| 副作用 | 否 | 否 | 是 |
| 可防抖 | 否 | 否 | 是 |

---

## 组件定义 (CompDefinition)

**位置**: `packages/shared/src/types/component.ts`

组件定义描述了一个组件的结构、属性和行为，用于组件注册。

```typescript
interface CompDefinition<P extends PropDefs = PropDefs> {
  /** 组件类型名（唯一标识） */
  name: string;
  
  /** 显示名称 */
  displayName: string;
  
  /** 分类 */
  category: 'basic' | 'layout' | 'data' | 'form' | 'chart' | 'custom';
  
  /** 图标（lucide 图标名） */
  icon: string;
  
  /** 组件描述 */
  description?: string;
  
  /** 属性定义 */
  props: P;
  
  /** 暴露配置（用于表达式引用） */
  expose?: ExposeConfig<P>;
  
  /** 计算暴露值（用于转换后的值） */
  exposeComputed?: (props: ResolvedProps<P>) => Record<string, unknown>;
  
  /** 默认尺寸 */
  defaultSize?: { w: number; h: number };
  
  /** 是否为容器组件 */
  isContainer?: boolean;
  
  /** 是否为覆盖层组件（如 Modal） */
  isOverlay?: boolean;
  
  /** 渲染函数 */
  view: (
    props: ResolvedProps<P>,
    ref: Ref<HTMLElement>,
    children?: ReactNode,
    handlers?: ComponentHandlers
  ) => ReactNode;
  
  /** 自定义属性面板 */
  propertyPanel?: (props: any) => ReactNode;
}
```

### 属性定义 (PropDefinition)

```typescript
type PropType = 'string' | 'number' | 'boolean' | 'select' | 
                'color' | 'json' | 'event' | 'expression';

interface PropDefinition<T = unknown> {
  /** 属性类型 */
  type: PropType;
  
  /** 默认值 */
  default: T;
  
  /** 选项列表（仅 select 类型） */
  options?: readonly string[];
  
  /** 属性描述 */
  description?: string;
}
```

### 暴露配置

```typescript
interface ExposeConfig<P extends PropDefs> {
  /** 暴露的状态属性 */
  states?: (keyof P)[];
  
  /** 暴露的方法 */
  methods?: Record<string, (ref: Ref<any>) => void>;
}
```

### 定义组件示例

```typescript
// packages/components/src/basic/ButtonComp.tsx
export const ButtonComp = defineComp({
  name: 'button',
  displayName: '按钮',
  category: 'basic',
  icon: 'lucide:mouse-pointer',
  description: '可点击的按钮组件',
  
  props: {
    text: prop.string('按钮'),
    variant: prop.select(
      ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
      'default'
    ),
    size: prop.select(['default', 'sm', 'lg'], 'default'),
    disabled: prop.boolean(false),
    loading: prop.boolean(false),
  },
  
  expose: {
    states: ['text', 'disabled', 'loading'],
  },
  
  defaultSize: { w: 4, h: 2 },
  
  view({ text, variant, size, disabled, loading }, ref) {
    return (
      <Button ref={ref} variant={variant} size={size} 
              disabled={disabled} loading={loading}>
        {text}
      </Button>
    );
  },
});
```

### 容器组件示例

```typescript
// packages/components/src/basic/ContainerComp.tsx
export const ContainerComp = defineComp({
  name: 'container',
  displayName: '容器',
  category: 'layout',
  icon: 'lucide:layout',
  
  props: {
    backgroundColor: prop.color('#ffffff'),
    padding: prop.select(['0', '2', '4', '6', '8'], '4'),
    // ...
  },
  
  // 标记为容器组件
  isContainer: true,
  
  defaultSize: { w: 12, h: 10 },
  
  // children 参数接收子组件
  view({ backgroundColor, padding }, ref, children) {
    return (
      <Card ref={ref} style={{ backgroundColor }}>
        {children ?? <span>拖拽组件到此容器</span>}
      </Card>
    );
  },
});
```

### 覆盖层组件示例

```typescript
// packages/components/src/layout/ModalComp.tsx
export const ModalComp = defineComp({
  name: 'modal',
  displayName: '弹窗',
  category: 'layout',
  
  props: {
    visible: prop.boolean(true),
    title: prop.string('弹窗标题'),
    // ...
  },
  
  // 容器组件（可以包含子组件）
  isContainer: true,
  
  // 覆盖层组件（不占用画布布局位置）
  isOverlay: true,
  
  expose: {
    states: ['visible'],
    methods: {
      open: () => {},
      close: () => {},
      toggle: () => {},
    },
  },
  
  // ...
});
```

---

## 运行时数据结构

### AppContext

**位置**: `packages/core/src/reactive/appContext.ts`

管理应用的运行时状态，是编辑器和预览模式的核心。

```typescript
class AppContext {
  // === 核心 Schema ===
  private _schema: Signal<AppData>;
  
  // === 页面管理 ===
  private _currentPageId: Signal<string>;
  get currentPage(): PageData | undefined;
  
  // === 组件实例 ===
  private _components: Signal<Map<string, CompInstance>>;
  
  // === 查询管理 ===
  readonly queryManager: QueryManager;
  
  // === 表达式上下文 ===
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
  
  // === 历史记录 ===
  readonly history: HistoryManager;
  
  // === 方法 ===
  addComponent(data: ComponentData, parentId?: string): void;
  updateComponent(id: string, updates: Partial<ComponentData>): void;
  deleteComponent(id: string): void;
  moveComponent(id: string, newParentId?: string, position?: {...}): void;
  
  undo(): boolean;
  redo(): boolean;
  
  toJSON(): AppData;
  fromJSON(data: AppData): void;
}
```

### CompInstance

**位置**: `packages/core/src/components/compInstance.ts`

组件的运行时实例，管理组件的状态和属性。

```typescript
class CompInstance<P extends PropDefs> {
  readonly id: string;
  readonly type: string;
  readonly definition: CompDefinition<P>;
  
  // 属性状态（支持表达式绑定）
  readonly props: { [K in keyof P]: CompState<P[K]['default']> };
  
  // 暴露的值（用于其他组件引用）
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
  
  // 组件名称
  get name(): string;
  updateName(newName: string): void;
  
  // 获取解析后的属性值
  getResolvedProps(): ResolvedProps<P>;
  
  // 设置属性值
  setProp(key: string, value: unknown): void;
  
  // 绑定表达式
  bindExpression(key: string, expr: string): void;
}
```

### CompState

**位置**: `packages/core/src/reactive/compState.ts`

管理单个属性的状态，支持静态值和表达式绑定。

```typescript
class CompState<T> {
  // 解析后的最终值（响应式）
  readonly value: ReadonlySignal<T>;
  
  // 设置静态值
  setValue(value: T): void;
  
  // 绑定表达式
  bindExpression(expr: string): void;
  
  // 清除表达式绑定
  clearExpression(): void;
  
  // 序列化
  toJSON(): T | string;
  fromJSON(data: unknown): void;
}
```

### QueryInstance

**位置**: `packages/core/src/datasource/queryManager.ts`

查询的运行时实例。

```typescript
class QueryInstance<T = unknown> {
  readonly definition: QueryDefinition;
  
  get state(): QueryState;
  get isFetching(): boolean;
  get data(): T | undefined;
  get error(): string | undefined;
  
  // 执行查询
  run(args?: Record<string, unknown>): Promise<QueryResult<T>>;
  
  // 取消查询
  cancel(): void;
  
  // 重置状态
  reset(): void;
  
  // 获取暴露的值
  getExposedValues(): QueryExposedValues<T>;
}
```

---

## 数据流转图

### 编辑时数据流

```
┌──────────────┐     拖拽/编辑    ┌──────────────┐
│   用户操作    │ ───────────────> │  AppContext  │
└──────────────┘                  └──────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │   Schema     │
                                  │   (Signal)   │
                                  └──────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
       ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
       │ CompInstance │           │ CompInstance │           │ CompInstance │
       │   (实例1)    │           │   (实例2)    │           │   (实例3)    │
       └──────────────┘           └──────────────┘           └──────────────┘
              │                          │                          │
              ▼                          ▼                          ▼
       ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
       │ exposedValues│           │ exposedValues│           │ exposedValues│
       └──────────────┘           └──────────────┘           └──────────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         ▼
                               ┌───────────────────┐
                               │ AppContext        │
                               │ .exposedValues    │
                               │ (汇总所有组件值)  │
                               └───────────────────┘
                                         │
                                         ▼
                               ┌───────────────────┐
                               │  表达式求值上下文  │
                               │ { button1: {...}, │
                               │   input1: {...},  │
                               │   query1: {...} } │
                               └───────────────────┘
```

### 保存/加载流程

```
保存流程:
AppContext.toJSON() ──> AppData (JSON) ──> API ──> Database (apps.schema)

加载流程:
Database ──> API ──> AppData (JSON) ──> AppContext.fromJSON() ──> 重建组件实例
```

### 表达式求值流程

```
属性值: "{{input1.value}}"
          │
          ▼
    ┌─────────────┐
    │ 检测是否包含│
    │ {{ }} 语法  │
    └─────────────┘
          │ 是
          ▼
    ┌─────────────┐
    │ 获取表达式  │
    │ 上下文      │
    │ (exposedValues)
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │ 沙箱求值    │
    │ evalInSandbox()
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │ 返回求值结果│
    └─────────────┘
```

---

## 数据库 Schema

**位置**: `packages/server/src/db/schema.ts`

### apps 表

```typescript
const apps = sqliteTable('apps', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  schema: text('schema').notNull(), // AppData JSON 字符串
  status: text('status', { 
    enum: ['draft', 'published', 'archived'] 
  }).notNull().default('draft'),
  publishedVersion: integer('published_version'),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
```

### appVersions 表

```typescript
const appVersions = sqliteTable('app_versions', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  version: integer('version').notNull(),
  schema: text('schema').notNull(), // AppData JSON 字符串
  createdAt: integer('created_at', { mode: 'timestamp' }),
  createdBy: text('created_by').notNull(),
});
```

---

## 附录：类型快速参考

### PropType 枚举

| 类型 | 说明 | 默认控件 |
|------|------|----------|
| `string` | 字符串 | Input 输入框 |
| `number` | 数字 | Number Input |
| `boolean` | 布尔值 | Switch 开关 |
| `select` | 枚举选择 | Select 下拉框 |
| `color` | 颜色值 | Color Picker |
| `json` | JSON 数据 | JSON Editor |
| `event` | 事件处理 | Event Editor |
| `expression` | 表达式 | Expression Editor |

### 组件分类

| 分类 | 说明 |
|------|------|
| `basic` | 基础组件（按钮、输入框、文本等） |
| `layout` | 布局组件（容器、分隔线、弹窗等） |
| `data` | 数据展示（表格、徽标、进度条等） |
| `form` | 表单控件（复选框、单选框、选择框等） |
| `chart` | 图表组件（预留） |
| `custom` | 自定义组件（预留） |

### Query 状态

| 状态 | 说明 |
|------|------|
| `idle` | 初始状态，未执行过 |
| `loading` | 正在执行中 |
| `success` | 执行成功 |
| `error` | 执行失败 |

---

> 文档版本: v1.0.0  
> 最后更新: 2026-01-16  
> 作者: AI Assistant
