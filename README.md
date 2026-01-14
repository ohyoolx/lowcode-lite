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

# 启动开发服务器
bun run dev:web
```

## 开发路线

- [x] 项目初始化 (Bun + Monorepo)
- [x] 核心响应式系统 (@preact/signals 封装)
- [x] 组件定义系统 (defineComp API)
- [x] 表达式引擎 (基础求值)
- [ ] 5 个基础组件 (Button, Input, Text, Container, Image)
- [ ] 拖拽画布
- [ ] 属性面板
- [ ] 后端服务

## License

MIT
