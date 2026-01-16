import { signal, computed, type Signal, type ReadonlySignal } from '../reactive/signals';
import type { TempStateDefinition, TempStateExposedValues } from '@lowcode-lite/shared';

/**
 * TempState 实例 - 管理单个临时状态
 */
export class TempStateInstance<T = unknown> {
  /** 状态定义 */
  readonly definition: TempStateDefinition;

  /** 当前值 */
  private _value: Signal<T>;

  /** 初始值 */
  private readonly _initialValue: T;

  constructor(definition: TempStateDefinition) {
    this.definition = definition;
    this._initialValue = definition.initialValue as T;
    this._value = signal<T>(this._initialValue);
  }

  /** 获取当前值 */
  get value(): T {
    return this._value.value;
  }

  /** 设置值 */
  setValue(value: T): void {
    this._value.value = value;
  }

  /** 重置为初始值 */
  reset(): void {
    this._value.value = this._initialValue;
  }

  /** 获取响应式值 Signal */
  get valueSignal(): ReadonlySignal<T> {
    return this._value;
  }

  /**
   * 获取暴露的值（用于表达式上下文）
   */
  getExposedValues(): TempStateExposedValues<T> {
    return {
      value: this.value,
      setValue: this.setValue.bind(this),
      reset: this.reset.bind(this),
    };
  }
}

/**
 * TempState 管理器 - 管理应用中所有的临时状态
 */
export class TempStateManager {
  /** 状态实例映射 */
  private _states: Map<string, TempStateInstance<unknown>> = new Map();

  /** 状态定义列表 */
  private _definitions: Signal<TempStateDefinition[]>;

  /** 所有状态暴露的值（computed） */
  readonly exposedValues: ReadonlySignal<Record<string, TempStateExposedValues<unknown>>>;

  constructor() {
    this._definitions = signal<TempStateDefinition[]>([]);

    // 计算所有暴露的值
    // 注意：需要订阅 _definitions 以便在添加/删除状态时触发重新计算
    this.exposedValues = computed(() => {
      // 订阅 definitions 变化，确保添加/删除状态时触发重新计算
      const definitions = this._definitions.value;
      
      const result: Record<string, TempStateExposedValues<unknown>> = {};
      for (const def of definitions) {
        const instance = this._states.get(def.id);
        if (instance) {
          // 访问 valueSignal.value 来触发响应式追踪
          instance.valueSignal.value;
          result[instance.definition.name] = instance.getExposedValues();
        }
      }
      return result;
    });
  }

  /**
   * 添加临时状态
   */
  addState(definition: TempStateDefinition): TempStateInstance<unknown> {
    const instance = new TempStateInstance(definition);
    this._states.set(definition.id, instance);
    this._definitions.value = [...this._definitions.value, definition];
    return instance;
  }

  /**
   * 更新临时状态定义
   */
  updateState(id: string, updates: Partial<TempStateDefinition>): void {
    const instance = this._states.get(id);
    if (!instance) return;

    // 创建新的定义
    const newDefinition: TempStateDefinition = {
      ...instance.definition,
      ...updates,
    };

    // 如果初始值更新了，需要创建新的实例
    if (updates.initialValue !== undefined) {
      const newInstance = new TempStateInstance(newDefinition);
      this._states.set(id, newInstance);
    }

    this._definitions.value = this._definitions.value.map((d) =>
      d.id === id ? newDefinition : d
    );
  }

  /**
   * 删除临时状态
   */
  removeState(id: string): void {
    this._states.delete(id);
    this._definitions.value = this._definitions.value.filter((d) => d.id !== id);
  }

  /**
   * 获取状态实例
   */
  getState(id: string): TempStateInstance<unknown> | undefined {
    return this._states.get(id);
  }

  /**
   * 根据名称获取状态
   */
  getStateByName(name: string): TempStateInstance<unknown> | undefined {
    for (const instance of this._states.values()) {
      if (instance.definition.name === name) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * 获取所有状态定义
   */
  get definitions(): TempStateDefinition[] {
    return this._definitions.value;
  }

  /**
   * 获取定义列表的信号，用于响应式订阅
   */
  get definitionsSignal(): ReadonlySignal<TempStateDefinition[]> {
    return this._definitions;
  }

  /**
   * 设置指定状态的值
   */
  setValue(idOrName: string, value: unknown): void {
    const instance = this._states.get(idOrName) ?? this.getStateByName(idOrName);
    if (instance) {
      instance.setValue(value);
    }
  }

  /**
   * 获取指定状态的值
   */
  getValue(idOrName: string): unknown {
    const instance = this._states.get(idOrName) ?? this.getStateByName(idOrName);
    return instance?.value;
  }

  /**
   * 重置所有状态
   */
  resetAll(): void {
    for (const instance of this._states.values()) {
      instance.reset();
    }
  }

  /**
   * 从状态定义列表初始化
   */
  loadStates(definitions: TempStateDefinition[]): void {
    // 清除现有状态
    this._states.clear();
    this._definitions.value = [];

    // 添加新状态
    for (const definition of definitions) {
      this.addState(definition);
    }
  }

  /**
   * 获取所有暴露的值（用于表达式上下文）
   */
  getAllExposedValues(): Record<string, TempStateExposedValues<unknown>> {
    return this.exposedValues.value;
  }
}

/**
 * 创建 TempState 管理器
 */
export function createTempStateManager(): TempStateManager {
  return new TempStateManager();
}
