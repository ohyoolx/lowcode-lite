import { z } from 'zod';

// ==================== 转换器（Transformer）类型定义 ====================

/**
 * 转换器定义 Schema
 * Transformer 是纯 JavaScript 函数，用于转换和派生数据
 * 它会自动追踪依赖并在依赖变化时重新计算
 */
export const TransformerDefinitionSchema = z.object({
  /** 唯一 ID */
  id: z.string(),
  /** 名称（用于表达式引用，如 transformer1.value） */
  name: z.string(),
  /** JavaScript 代码（返回转换后的值） */
  code: z.string().default('return null;'),
  /** 描述（可选，用于文档） */
  description: z.string().optional(),
  /** 是否启用（禁用后不会执行） */
  enabled: z.boolean().default(true),
});
export type TransformerDefinition = z.infer<typeof TransformerDefinitionSchema>;

/**
 * 转换器状态
 */
export type TransformerState = 'idle' | 'computing' | 'success' | 'error';

/**
 * 转换器暴露的值（用于表达式上下文）
 * 在表达式中可以通过 transformerName.value 访问计算结果
 */
export interface TransformerExposedValues<T = unknown> {
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

/**
 * 创建默认的转换器定义
 */
export function createDefaultTransformer(id: string, name: string): TransformerDefinition {
  return {
    id,
    name,
    code: '// 在这里编写转换逻辑\n// 可以访问其他组件和查询的数据\n// 例如: return query1.data.map(item => item.name);\n\nreturn null;',
    description: '',
    enabled: true,
  };
}
