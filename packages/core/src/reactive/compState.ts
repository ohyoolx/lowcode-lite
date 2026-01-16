import { signal, computed, type Signal, type ReadonlySignal } from './signals';
import { evaluateExpr, isExpression } from '../expression';

/**
 * 表达式上下文提供者
 * 可以是 Signal（推荐，支持响应式追踪）或函数（向后兼容）
 */
export type ExpressionContextProvider = 
  | ReadonlySignal<Record<string, any>>
  | (() => Record<string, any>);

/**
 * 组件状态 - 支持静态值和表达式绑定
 */
export class CompState<T> {
  // 原始值
  private _rawValue: Signal<T | undefined>;
  
  // 表达式
  private _expression: Signal<string>;
  
  // 是否使用表达式
  private _useExpression: Signal<boolean>;
  
  // 计算后的最终值
  readonly value: ReadonlySignal<T>;
  
  constructor(
    private defaultValue: T,
    private expressionContextProvider: ExpressionContextProvider
  ) {
    this._rawValue = signal<T | undefined>(undefined);
    this._expression = signal<string>('');
    this._useExpression = signal(false);
    
    // 计算最终值
    // 注意：必须在 computed 回调内部直接访问 Signal.value，才能正确建立依赖追踪
    this.value = computed(() => {
      if (this._useExpression.value && this._expression.value) {
        try {
          // 直接在 computed 内访问 Signal.value，确保依赖追踪正常工作
          const context = typeof this.expressionContextProvider === 'function'
            ? this.expressionContextProvider()
            : this.expressionContextProvider.value;
          
          return evaluateExpr(this._expression.value, context) as T;
        } catch (error) {
          console.warn('Expression evaluation failed:', error);
          return this.defaultValue;
        }
      }
      return this._rawValue.value ?? this.defaultValue;
    });
  }
  
  /**
   * 设置原始值
   */
  set(value: T) {
    this._useExpression.value = false;
    this._rawValue.value = value;
  }
  
  /**
   * 绑定表达式
   */
  bind(expression: string) {
    this._useExpression.value = true;
    this._expression.value = expression;
  }
  
  /**
   * 从 JSON 初始化
   */
  fromJSON(value: any) {
    if (isExpression(value)) {
      this.bind(value);
    } else if (value !== undefined) {
      this.set(value as T);
    }
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): any {
    if (this._useExpression.value) {
      return this._expression.value;
    }
    return this._rawValue.value ?? this.defaultValue;
  }
  
  /**
   * 检查是否使用表达式
   */
  get isExpression(): boolean {
    return this._useExpression.value;
  }
  
  /**
   * 获取原始表达式
   */
  get expressionText(): string {
    return this._expression.value;
  }
}

/**
 * 创建组件状态
 */
export function createCompState<T>(
  defaultValue: T,
  expressionContextProvider: ExpressionContextProvider
): CompState<T> {
  return new CompState(defaultValue, expressionContextProvider);
}

// 向后兼容的类型别名
export type ExpressionContext = () => Record<string, any>;
