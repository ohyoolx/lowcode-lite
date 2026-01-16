import type { ReactNode, Ref } from 'react';

// 组件分类
export type ComponentCategory = 'basic' | 'layout' | 'data' | 'form' | 'chart' | 'custom';

// 属性类型
export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'json'
  | 'event'
  | 'expression';

// 属性定义
export interface PropDefinition<T = unknown> {
  type: PropType;
  default: T;
  options?: readonly string[]; // for select type
  description?: string;
}

// 属性定义映射
export type PropDefs = Record<string, PropDefinition>;

// 解析属性类型
export type ResolvedPropType<T extends PropDefinition> = T['default'];

// 解析所有属性
export type ResolvedProps<P extends PropDefs> = {
  [K in keyof P]: ResolvedPropType<P[K]>;
};

// 暴露配置
export interface ExposeConfig<P extends PropDefs> {
  states?: (keyof P)[];
  methods?: Record<string, (ref: Ref<any>) => void>;
}

// 组件事件处理器
export interface ComponentHandlers {
  /** 更新组件属性 */
  onChange: (propName: string, value: any) => void;
  /** 触发事件 */
  triggerEvent?: (eventName: string, payload?: any) => void;
}

// 组件定义
export interface CompDefinition<P extends PropDefs = PropDefs> {
  name: string;
  displayName: string;
  category: ComponentCategory;
  icon: string;
  description?: string;
  props: P;
  expose?: ExposeConfig<P>;
  /** 
   * 计算暴露值 - 用于暴露经过计算/转换的值
   * 例如：将 JSON 字符串解析为对象后再暴露
   */
  exposeComputed?: (props: ResolvedProps<P>) => Record<string, unknown>;
  defaultSize?: { w: number; h: number };
  /** 是否为容器组件（可以嵌套子组件） */
  isContainer?: boolean;
  /** 是否为覆盖层组件（如 Modal，不占用画布布局位置） */
  isOverlay?: boolean;
  view: (
    props: ResolvedProps<P>, 
    ref: Ref<HTMLElement>, 
    children?: ReactNode,
    handlers?: ComponentHandlers
  ) => ReactNode;
  propertyPanel?: (props: any) => ReactNode;
}

// 组件清单（用于注册）
export interface ComponentManifest {
  name: string;
  displayName: string;
  category: ComponentCategory;
  icon: string;
  description?: string;
  defaultSize: { w: number; h: number };
  /** 是否为容器组件 */
  isContainer?: boolean;
  /** 是否为覆盖层组件 */
  isOverlay?: boolean;
}
