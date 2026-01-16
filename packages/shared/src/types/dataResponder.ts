import { z } from 'zod';

// ==================== 数据响应器（DataResponder）类型定义 ====================

/**
 * 数据响应器定义 Schema
 * DataResponder 用于监听数据变化并执行 JavaScript 代码
 * 类似于 React 的 useEffect，但可以监听任意表达式
 */
export const DataResponderDefinitionSchema = z.object({
  /** 唯一 ID */
  id: z.string(),
  /** 名称（用于标识和调试） */
  name: z.string(),
  /** 监听的表达式（当这些表达式的值变化时触发） */
  watch: z.array(z.string()).default([]),
  /** 触发时执行的 JavaScript 代码 */
  code: z.string().default('// 响应数据变化\nconsole.log("数据已变化");'),
  /** 描述（可选，用于文档） */
  description: z.string().optional(),
  /** 是否启用（禁用后不会触发） */
  enabled: z.boolean().default(true),
  /** 是否在初始化时执行一次 */
  runOnInit: z.boolean().default(false),
  /** 防抖时间（毫秒，0 表示不防抖） */
  debounceMs: z.number().default(0),
});
export type DataResponderDefinition = z.infer<typeof DataResponderDefinitionSchema>;

/**
 * 数据响应器状态
 */
export type DataResponderState = 'idle' | 'running' | 'success' | 'error';

/**
 * 数据响应器暴露的值（用于表达式上下文）
 */
export interface DataResponderExposedValues {
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

/**
 * 创建默认的数据响应器定义
 */
export function createDefaultDataResponder(id: string, name: string): DataResponderDefinition {
  return {
    id,
    name,
    watch: [],
    code: '// 当监听的数据变化时执行\n// 可以访问所有组件、查询和状态\n\nconsole.log("数据已变化");',
    description: '',
    enabled: true,
    runOnInit: false,
    debounceMs: 0,
  };
}
