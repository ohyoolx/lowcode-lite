import { z } from 'zod';

// ==================== 临时状态（TempState）类型定义 ====================

/**
 * 临时状态定义 Schema
 * TempState 是应用中的临时变量，用于存储运行时状态
 * 类似于 React 的 useState，但是可以在表达式中访问
 */
export const TempStateDefinitionSchema = z.object({
  /** 唯一 ID */
  id: z.string(),
  /** 名称（用于表达式引用，如 state1.value） */
  name: z.string(),
  /** 初始值（支持 JSON 类型） */
  initialValue: z.any().default(null),
  /** 描述（可选，用于文档） */
  description: z.string().optional(),
});
export type TempStateDefinition = z.infer<typeof TempStateDefinitionSchema>;

/**
 * 临时状态暴露的值（用于表达式上下文）
 * 在表达式中可以通过 stateName.value 访问值
 * 通过 stateName.setValue(newValue) 修改值
 */
export interface TempStateExposedValues<T = unknown> {
  /** 当前值 */
  value: T;
  /** 设置新值 */
  setValue: (value: T) => void;
  /** 重置为初始值 */
  reset: () => void;
}

/**
 * 创建默认的临时状态定义
 */
export function createDefaultTempState(id: string, name: string): TempStateDefinition {
  return {
    id,
    name,
    initialValue: null,
    description: '',
  };
}
