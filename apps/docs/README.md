# Lowcode-Lite 开发文档

欢迎阅读 Lowcode-Lite 开发文档。这些文档旨在帮助开发者理解项目的核心设计和数据结构。

## 文档目录

| 文档 | 说明 |
|------|------|
| [SCHEMA.md](./SCHEMA.md) | **核心数据结构文档** - 详细描述 AppData、ComponentData、QueryDefinition 等 Schema |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | **架构设计文档** - 项目结构、模块划分、响应式系统、表达式系统等 |

## 快速索引

### Schema 相关

- [AppData](./SCHEMA.md#应用-schema-appdata) - 应用顶层数据结构
- [PageData](./SCHEMA.md#页面-schema-pagedata) - 页面数据结构
- [ComponentData](./SCHEMA.md#组件-schema-componentdata) - 组件数据结构
- [QueryDefinition](./SCHEMA.md#查询-schema-querydefinition) - 查询定义
- [CompDefinition](./SCHEMA.md#组件定义-compdefinition) - 组件定义规范

### 架构相关

- [项目结构](./ARCHITECTURE.md#项目结构) - Monorepo 目录结构
- [包说明](./ARCHITECTURE.md#monorepo-包说明) - 各个 package 的职责
- [响应式系统](./ARCHITECTURE.md#响应式系统) - Signal 使用方式
- [表达式系统](./ARCHITECTURE.md#表达式系统) - `{{}}` 语法说明
- [组件系统](./ARCHITECTURE.md#组件系统) - 组件定义和注册

## 核心概念速查

### 数据结构层级

```
AppData (应用)
  ├── pages[] (页面)
  │     └── components[] (组件)
  │           └── children[] (嵌套子组件)
  └── queries[] (查询)
```

### 组件分类

| 分类 | 组件 |
|------|------|
| basic | button, input, text, image, container |
| layout | divider, form, modal |
| data | table, badge, progress |
| form | checkbox, radio, select, switch, textarea |

### 表达式语法

```javascript
{{componentName.property}}    // 简单引用
{{query1.data}}               // 查询数据
{{input1.value.toUpperCase()}}// 方法调用
你输入了: {{input1.value}}    // 混合文本
```

### 网格系统

| 配置 | 值 |
|------|-----|
| 列数 | 24 |
| 行数 | 100 |
| 行高 | 16px |
| 最小尺寸 | 2×2 |

## 相关资源

- [主 README](../../README.md) - 项目介绍和快速开始
- [开发计划](../../LOWCODE_LITE_PLAN.md) - 详细的开发路线图

---

> 最后更新: 2026-01-16
