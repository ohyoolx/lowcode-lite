import { signal, computed, type Signal, type ReadonlySignal } from '../reactive/signals';
import type { TransformerDefinition, TransformerExposedValues, TransformerState } from '@lowcode-lite/shared';

/**
 * Transformer 实例 - 管理单个转换器的状态和计算
 */
export class TransformerInstance<T = unknown> {
  /** 转换器定义 */
  readonly definition: TransformerDefinition;

  /** 当前状态 */
  private _state: Signal<TransformerState>;

  /** 计算结果 */
  private _value: Signal<T | undefined>;

  /** 错误信息 */
  private _error: Signal<string | undefined>;

  /** 最后计算时间 */
  private _lastComputeTime: Signal<number | undefined>;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** 
   * 暴露值的响应式信号
   * 这是一个 computed，追踪所有内部状态的变化
   * 注意：只追踪数据 signals，不会触发 compute()
   */
  readonly exposedSignal: ReadonlySignal<TransformerExposedValues<T>>;

  constructor(
    definition: TransformerDefinition,
    options?: {
      getContext?: () => Record<string, unknown>;
    }
  ) {
    this.definition = definition;
    this._getContext = options?.getContext;
    this._state = signal<TransformerState>('idle');
    this._value = signal<T | undefined>(undefined);
    this._error = signal<string | undefined>(undefined);
    this._lastComputeTime = signal<number | undefined>(undefined);
    
    // 创建暴露值的响应式 computed
    // 这个 computed 只追踪内部数据 signals，不会调用 getContext
    this.exposedSignal = computed(() => ({
      value: this._value.value as T,
      state: this._state.value,
      error: this._error.value,
      lastComputeTime: this._lastComputeTime.value,
      refresh: this.refresh.bind(this),
    }));
  }

  /** 获取当前状态 */
  get state(): TransformerState {
    return this._state.value;
  }

  /** 获取计算结果 */
  get value(): T | undefined {
    return this._value.value;
  }

  /** 获取错误信息 */
  get error(): string | undefined {
    return this._error.value;
  }

  /** 获取最后计算时间 */
  get lastComputeTime(): number | undefined {
    return this._lastComputeTime.value;
  }

  /** 响应式状态 Signal */
  get stateSignal(): ReadonlySignal<TransformerState> {
    return this._state;
  }

  /** 响应式值 Signal */
  get valueSignal(): ReadonlySignal<T | undefined> {
    return this._value;
  }

  /**
   * 计算转换器的值
   */
  compute(): T | undefined {
    if (!this.definition.enabled) {
      return this._value.value;
    }

    const startTime = Date.now();
    this._state.value = 'computing';
    this._error.value = undefined;

    try {
      const context = this._getContext?.() ?? {};
      
      // 在沙箱中执行 JavaScript 代码
      // 使用 Function 构造器创建函数
      const fn = new Function(
        ...Object.keys(context),
        `"use strict";\n${this.definition.code}`
      );
      
      const result = fn(...Object.values(context)) as T;

      this._value.value = result;
      this._state.value = 'success';
      this._lastComputeTime.value = Date.now() - startTime;

      return result;
    } catch (error) {
      this._error.value = error instanceof Error ? error.message : String(error);
      this._state.value = 'error';
      this._lastComputeTime.value = Date.now() - startTime;
      return undefined;
    }
  }

  /**
   * 强制重新计算
   */
  refresh(): void {
    this.compute();
  }

  /**
   * 重置转换器状态
   */
  reset(): void {
    this._state.value = 'idle';
    this._value.value = undefined;
    this._error.value = undefined;
    this._lastComputeTime.value = undefined;
  }

  /**
   * 获取暴露的值（用于表达式上下文）
   * 直接返回 exposedSignal 的当前值
   */
  getExposedValues(): TransformerExposedValues<T> {
    return this.exposedSignal.value;
  }
}

/**
 * Transformer 管理器 - 管理应用中所有的转换器
 */
export class TransformerManager {
  /** 转换器实例映射 */
  private _transformers: Map<string, TransformerInstance<unknown>> = new Map();

  /** 转换器定义列表 */
  private _definitions: Signal<TransformerDefinition[]>;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** 所有转换器暴露的值（computed） */
  readonly exposedValues: ReadonlySignal<Record<string, TransformerExposedValues<unknown>>>;

  constructor(options?: {
    getContext?: () => Record<string, unknown>;
  }) {
    this._getContext = options?.getContext;
    this._definitions = signal<TransformerDefinition[]>([]);

    // 计算所有暴露的值
    // 通过订阅每个实例的 exposedSignal 来实现响应式更新
    // 这样当任何 transformer 的值变化时，这个 computed 会自动重新计算
    this.exposedValues = computed(() => {
      // 订阅 definitions 变化，确保添加/删除转换器时触发重新计算
      const definitions = this._definitions.value;
      
      const result: Record<string, TransformerExposedValues<unknown>> = {};
      for (const def of definitions) {
        const instance = this._transformers.get(def.id);
        if (instance) {
          // 访问 exposedSignal.value 来建立响应式追踪
          // exposedSignal 只追踪内部数据 signals，不会触发 compute()
          // 这样避免了循环依赖
          result[instance.definition.name] = instance.exposedSignal.value;
        }
      }
      return result;
    });
  }

  /**
   * 添加转换器
   */
  addTransformer(definition: TransformerDefinition): TransformerInstance<unknown> {
    const instance = new TransformerInstance(definition, {
      getContext: this._getContext,
    });

    this._transformers.set(definition.id, instance);
    this._definitions.value = [...this._definitions.value, definition];

    return instance;
  }

  /**
   * 更新转换器定义
   */
  updateTransformer(id: string, updates: Partial<TransformerDefinition>): void {
    const instance = this._transformers.get(id);
    if (!instance) return;

    // 创建新的定义
    const newDefinition: TransformerDefinition = {
      ...instance.definition,
      ...updates,
    };

    // 创建新的实例
    const newInstance = new TransformerInstance(newDefinition, {
      getContext: this._getContext,
    });

    this._transformers.set(id, newInstance);
    this._definitions.value = this._definitions.value.map((d) =>
      d.id === id ? newDefinition : d
    );

    // 触发重新计算
    if (newDefinition.enabled) {
      newInstance.compute();
    }
  }

  /**
   * 删除转换器
   */
  removeTransformer(id: string): void {
    this._transformers.delete(id);
    this._definitions.value = this._definitions.value.filter((d) => d.id !== id);
  }

  /**
   * 获取转换器实例
   */
  getTransformer(id: string): TransformerInstance<unknown> | undefined {
    return this._transformers.get(id);
  }

  /**
   * 根据名称获取转换器
   */
  getTransformerByName(name: string): TransformerInstance<unknown> | undefined {
    for (const instance of this._transformers.values()) {
      if (instance.definition.name === name) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * 获取所有转换器定义
   */
  get definitions(): TransformerDefinition[] {
    return this._definitions.value;
  }

  /**
   * 获取定义列表的信号，用于响应式订阅
   */
  get definitionsSignal(): ReadonlySignal<TransformerDefinition[]> {
    return this._definitions;
  }

  /**
   * 刷新指定转换器
   */
  refreshTransformer(idOrName: string): void {
    const instance = this._transformers.get(idOrName) ?? this.getTransformerByName(idOrName);
    if (instance) {
      instance.refresh();
    }
  }
  
  /**
   * 重新计算所有转换器
   */
  computeAll(): void {
    for (const instance of this._transformers.values()) {
      if (instance.definition.enabled) {
        instance.compute();
      }
    }
  }

  /**
   * 重置所有转换器
   */
  resetAll(): void {
    for (const instance of this._transformers.values()) {
      instance.reset();
    }
  }

  /**
   * 从转换器定义列表初始化
   */
  loadTransformers(definitions: TransformerDefinition[]): void {
    // 清除现有转换器
    this._transformers.clear();
    this._definitions.value = [];

    // 添加新转换器
    for (const definition of definitions) {
      this.addTransformer(definition);
    }
  }

  /**
   * 获取所有暴露的值（用于表达式上下文）
   */
  getAllExposedValues(): Record<string, TransformerExposedValues<unknown>> {
    return this.exposedValues.value;
  }
}

/**
 * 创建 Transformer 管理器
 */
export function createTransformerManager(options?: {
  getContext?: () => Record<string, unknown>;
}): TransformerManager {
  return new TransformerManager(options);
}
