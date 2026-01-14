import type { PropDefinition } from '@lowcode-lite/shared';

/**
 * 属性定义辅助函数
 * 用于简化组件属性的定义
 */
export const prop = {
  /**
   * 字符串属性
   */
  string: (defaultValue = ''): PropDefinition<string> => ({
    type: 'string',
    default: defaultValue,
  }),
  
  /**
   * 数字属性
   */
  number: (defaultValue = 0): PropDefinition<number> => ({
    type: 'number',
    default: defaultValue,
  }),
  
  /**
   * 布尔属性
   */
  boolean: (defaultValue = false): PropDefinition<boolean> => ({
    type: 'boolean',
    default: defaultValue,
  }),
  
  /**
   * 选择属性
   */
  select: <T extends readonly string[]>(
    options: T,
    defaultValue: T[number]
  ): PropDefinition<T[number]> => ({
    type: 'select',
    options,
    default: defaultValue,
  }),
  
  /**
   * 颜色属性
   */
  color: (defaultValue = '#000000'): PropDefinition<string> => ({
    type: 'color',
    default: defaultValue,
  }),
  
  /**
   * JSON 属性
   */
  json: <T>(defaultValue: T): PropDefinition<T> => ({
    type: 'json',
    default: defaultValue,
  }),
  
  /**
   * 事件属性
   */
  event: (): PropDefinition<(() => void) | undefined> => ({
    type: 'event',
    default: undefined,
  }),
  
  /**
   * 表达式属性（支持 {{xxx}} 语法）
   */
  expression: <T>(defaultValue: T): PropDefinition<T> => ({
    type: 'expression',
    default: defaultValue,
  }),
};

export type { PropDefinition };
