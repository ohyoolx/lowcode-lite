# LowCode Lite

轻量化、易上手、可扩展的低代码平台

## 技术栈

- **前端**: React 18 + @preact/signals-react + shadcn/ui
- **后端**: Bun + Hono + SQLite + Drizzle ORM
- **构建**: Vite + Turbo (Monorepo)

## 项目结构

```
lowcode-lite/
├── packages/
│   ├── core/         # 核心库 (组件系统、响应式、表达式)
│   ├── editor/       # 编辑器 (画布、面板)
│   ├── components/   # 内置组件库
│   ├── server/       # 后端服务
│   └── shared/       # 共享类型和工具
├── apps/
│   ├── web/          # Web 应用
│   └── docs/         # 文档站点
└── turbo.json        # Monorepo 配置
```

## 快速开始

```bash
# 进入项目目录
cd lowcode-lite

# 安装依赖
bun install

# 启动开发服务器 (前端 + 后端)
bun run dev
```

## 功能特性

- **拖拽画布**: 网格布局、组件拖放、大小调整
- **组件库**: 基础组件、表单组件、数据展示组件、布局组件
- **表达式系统**: 支持 `{{}}` 语法的动态数据绑定
- **自动补全**: 输入表达式时提示可用的组件名和属性
- **实时预览**: 表达式求值结果实时显示
- **数据源**: REST API 查询编辑器
- **历史记录**: Undo/Redo 支持
- **应用管理**: 创建、保存、发布应用

## 开发路线

- [x] 项目初始化 (Bun + Monorepo)
- [x] 核心响应式系统 (@preact/signals 封装)
- [x] 组件定义系统 (defineComp API)
- [x] 表达式引擎 (基础求值)
- [x] 基础组件 (Button, Input, Text, Container, Image 等)
- [x] 拖拽画布 (网格吸附、组件调整)
- [x] 属性面板 (动态表单、表达式编辑器)
- [x] 后端服务 (Hono + SQLite)
- [x] 表达式编辑器 (自动补全、实时预览)
- [x] 数据源连接 (REST API 查询)
- [ ] 用户认证
- [ ] 自定义组件上传
- [ ] 主题系统

## 表达式语法

在组件属性中使用 `{{}}` 语法可以引用其他组件的数据：

```
// 简单引用
{{input1.value}}           // 获取输入框的值
{{table1.data}}            // 获取表格数据

// 混合文本
你输入的是: {{input1.value}}

// 复杂表达式
共 {{table1.data.length}} 条数据
{{input1.value.toUpperCase()}}
```

## License

MIT
