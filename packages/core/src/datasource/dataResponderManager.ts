import { signal, effect, computed, type Signal, type ReadonlySignal } from '../reactive/signals';
import type { DataResponderDefinition, DataResponderExposedValues, DataResponderState } from '@lowcode-lite/shared';

/**
 * DataResponder 实例 - 管理单个数据响应器
 * 使用 Preact Signals 的 effect 实现真正的响应式监听
 */
export class DataResponderInstance {
  /** 响应器定义 */
  readonly definition: DataResponderDefinition;

  /** 当前状态 */
  private _state: Signal<DataResponderState>;

  /** 错误信息 */
  private _error: Signal<string | undefined>;

  /** 最后执行时间 */
  private _lastRunTime: Signal<number | undefined>;

  /** 执行次数 */
  private _runCount: Signal<number>;

  /** 是否启用 */
  private _enabled: Signal<boolean>;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** 表达式求值函数 */
  private _evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;

  /** 防抖定时器 */
  private _debounceTimer?: ReturnType<typeof setTimeout>;

  /** effect 清理函数 */
  private _effectCleanup?: () => void;

  /** 是否是首次运行（用于 runOnInit 逻辑） */
  private _isFirstRun: boolean = true;

  /** 上一次的依赖值快照（用于比较变化） */
  private _lastDependencyValues: unknown[] = [];

  /** 暴露值的响应式信号 */
  readonly exposedSignal: ReadonlySignal<DataResponderExposedValues>;

  constructor(
    definition: DataResponderDefinition,
    options?: {
      getContext?: () => Record<string, unknown>;
      evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
    }
  ) {
    this.definition = definition;
    this._getContext = options?.getContext;
    this._evaluateExpression = options?.evaluateExpression;
    this._state = signal<DataResponderState>('idle');
    this._error = signal<string | undefined>(undefined);
    this._lastRunTime = signal<number | undefined>(undefined);
    this._runCount = signal(0);
    this._enabled = signal(definition.enabled);

    // 创建暴露值的响应式 computed
    this.exposedSignal = computed(() => ({
      state: this._state.value,
      error: this._error.value,
      lastRunTime: this._lastRunTime.value,
      runCount: this._runCount.value,
      trigger: this.trigger.bind(this),
      setEnabled: this.setEnabled.bind(this),
    }));
  }

  /** 获取当前状态 */
  get state(): DataResponderState {
    return this._state.value;
  }

  /** 获取错误信息 */
  get error(): string | undefined {
    return this._error.value;
  }

  /** 获取最后执行时间 */
  get lastRunTime(): number | undefined {
    return this._lastRunTime.value;
  }

  /** 获取执行次数 */
  get runCount(): number {
    return this._runCount.value;
  }

  /** 是否启用 */
  get enabled(): boolean {
    return this._enabled.value;
  }

  /** 设置启用状态 */
  setEnabled(enabled: boolean): void {
    const wasEnabled = this._enabled.value;
    this._enabled.value = enabled;
    
    // 如果从禁用变为启用，重新启动监听
    if (!wasEnabled && enabled) {
      this.start();
    }
    // 如果从启用变为禁用，停止监听
    if (wasEnabled && !enabled) {
      this.stop();
    }
  }

  /**
   * 启动响应式监听
   * 使用 effect 来追踪 watch 表达式中涉及的所有 signals
   * 
   * 注意：由于 evaluateExpression 使用 Function 构造器执行代码，
   * 它无法建立对 Preact Signals 的追踪。因此我们需要在 effect 中
   * 直接访问 _getContext()（即 appContext.exposedValues.value），
   * 这样当 exposedValues 变化时，effect 会重新执行。
   * 然后我们在 effect 内部检查具体的 watch 表达式值是否变化。
   */
  start(): void {
    // 先停止之前的监听
    this.stop();
    
    if (!this._enabled.value || this.definition.watch.length === 0) {
      return;
    }

    this._isFirstRun = true;
    
    // 初始化上一次的依赖值
    this._lastDependencyValues = this._getDependencyValues();

    // 使用 effect 来响应式监听
    // 关键：在 effect 内部访问 _getContext()，这会触发 appContext.exposedValues computed
    // 当 exposedValues 变化时（包括组件值变化），effect 会重新执行
    this._effectCleanup = effect(() => {
      // 访问 context 以建立对 exposedValues 的追踪
      // _getContext() 返回 appContext.exposedValues.value
      // 这个访问会让 effect 订阅 exposedValues 的变化
      const context = this._getContext?.();
      
      // DEBUG: 打印 effect 触发
      console.log('[DataResponder] effect triggered for:', this.definition.name, 'context keys:', context ? Object.keys(context) : 'none');
      
      // 如果没有 context，说明还在初始化中
      if (!context) {
        return;
      }
      
      // 计算当前监听表达式的值
      const currentValues = this.definition.watch.map(expr => {
        try {
          const value = this._evaluateExpression?.(expr, context);
          console.log('[DataResponder] watch expr:', expr, '=', value);
          return value;
        } catch (e) {
          console.log('[DataResponder] watch expr error:', expr, e);
          return undefined;
        }
      });
      
      // 首次运行时
      if (this._isFirstRun) {
        this._isFirstRun = false;
        this._lastDependencyValues = currentValues;
        console.log('[DataResponder] first run, lastValues:', currentValues);
        
        // 如果配置了 runOnInit，立即执行一次
        if (this.definition.runOnInit) {
          this._scheduleExecution();
        }
        return;
      }
      
      // 比较值是否变化
      const hasChanged = this._hasDependencyChanged(currentValues);
      console.log('[DataResponder] hasChanged:', hasChanged, 'current:', currentValues, 'last:', this._lastDependencyValues);
      
      if (hasChanged) {
        this._lastDependencyValues = currentValues;
        this._scheduleExecution();
      }
    });
  }

  /**
   * 停止监听
   */
  stop(): void {
    if (this._effectCleanup) {
      this._effectCleanup();
      this._effectCleanup = undefined;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
  }

  /**
   * 手动触发执行
   */
  trigger(): void {
    this._execute();
  }

  /**
   * 获取当前依赖值（非响应式，用于初始化）
   */
  private _getDependencyValues(): unknown[] {
    if (!this._evaluateExpression || !this._getContext) {
      return [];
    }

    try {
      const context = this._getContext();
      return this.definition.watch.map(expr => {
        try {
          return this._evaluateExpression!(expr, context);
        } catch {
          return undefined;
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * 检查依赖是否变化
   */
  private _hasDependencyChanged(currentValues: unknown[]): boolean {
    if (currentValues.length !== this._lastDependencyValues.length) {
      return true;
    }

    for (let i = 0; i < currentValues.length; i++) {
      if (!this._deepEqual(currentValues[i], this._lastDependencyValues[i])) {
        return true;
      }
    }

    return false;
  }

  /**
   * 简单的深度比较
   */
  private _deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return a === b;
    if (typeof a !== 'object') return a === b;

    // 简单的 JSON 比较（适用于大多数情况）
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  /**
   * 调度执行（支持防抖）
   */
  private _scheduleExecution(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    if (this.definition.debounceMs > 0) {
      this._debounceTimer = setTimeout(() => {
        this._execute();
      }, this.definition.debounceMs);
    } else {
      // 使用 setTimeout(0) 确保在当前 effect 执行完成后再执行
      // 避免在 effect 内部修改状态导致的问题
      setTimeout(() => {
        this._execute();
      }, 0);
    }
  }

  /**
   * 执行响应器代码
   */
  private _execute(): void {
    const startTime = Date.now();
    this._state.value = 'running';
    this._error.value = undefined;

    try {
      const context = this._getContext?.() ?? {};

      // 在沙箱中执行 JavaScript 代码
      const fn = new Function(
        ...Object.keys(context),
        `"use strict";\n${this.definition.code}`
      );

      fn(...Object.values(context));

      this._state.value = 'success';
      this._lastRunTime.value = Date.now() - startTime;
      this._runCount.value++;
    } catch (error) {
      this._error.value = error instanceof Error ? error.message : String(error);
      this._state.value = 'error';
      this._lastRunTime.value = Date.now() - startTime;
      this._runCount.value++;
    }
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.stop();
    this._state.value = 'idle';
    this._error.value = undefined;
    this._lastRunTime.value = undefined;
    this._runCount.value = 0;
    this._lastDependencyValues = [];
    this._isFirstRun = true;
  }

  /**
   * 获取暴露的值（用于表达式上下文）
   */
  getExposedValues(): DataResponderExposedValues {
    return this.exposedSignal.value;
  }
}

/**
 * DataResponder 管理器 - 管理应用中所有的数据响应器
 */
export class DataResponderManager {
  /** 响应器实例映射 */
  private _responders: Map<string, DataResponderInstance> = new Map();

  /** 响应器定义列表 */
  private _definitions: Signal<DataResponderDefinition[]>;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** 表达式求值函数 */
  private _evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;

  /** 所有响应器暴露的值（computed） */
  readonly exposedValues: ReadonlySignal<Record<string, DataResponderExposedValues>>;

  constructor(options?: {
    getContext?: () => Record<string, unknown>;
    evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
  }) {
    this._getContext = options?.getContext;
    this._evaluateExpression = options?.evaluateExpression;
    this._definitions = signal<DataResponderDefinition[]>([]);

    // 计算所有暴露的值
    this.exposedValues = computed(() => {
      const definitions = this._definitions.value;
      
      const result: Record<string, DataResponderExposedValues> = {};
      for (const def of definitions) {
        const instance = this._responders.get(def.id);
        if (instance) {
          // 访问 exposedSignal.value 建立响应式追踪
          result[instance.definition.name] = instance.exposedSignal.value;
        }
      }
      return result;
    });
  }

  /**
   * 添加响应器
   */
  addResponder(definition: DataResponderDefinition): DataResponderInstance {
    const instance = new DataResponderInstance(definition, {
      getContext: this._getContext,
      evaluateExpression: this._evaluateExpression,
    });

    this._responders.set(definition.id, instance);
    this._definitions.value = [...this._definitions.value, definition];

    // 启动响应式监听
    instance.start();

    return instance;
  }

  /**
   * 更新响应器定义
   */
  updateResponder(id: string, updates: Partial<DataResponderDefinition>): void {
    const instance = this._responders.get(id);
    if (!instance) return;

    // 停止旧的实例
    instance.stop();

    // 创建新的定义
    const newDefinition: DataResponderDefinition = {
      ...instance.definition,
      ...updates,
    };

    // 创建新的实例
    const newInstance = new DataResponderInstance(newDefinition, {
      getContext: this._getContext,
      evaluateExpression: this._evaluateExpression,
    });

    this._responders.set(id, newInstance);
    this._definitions.value = this._definitions.value.map((d) =>
      d.id === id ? newDefinition : d
    );

    // 启动新实例
    if (newDefinition.enabled) {
      newInstance.start();
    }
  }

  /**
   * 删除响应器
   */
  removeResponder(id: string): void {
    const instance = this._responders.get(id);
    if (instance) {
      instance.stop();
      this._responders.delete(id);
      this._definitions.value = this._definitions.value.filter((d) => d.id !== id);
    }
  }

  /**
   * 获取响应器实例
   */
  getResponder(id: string): DataResponderInstance | undefined {
    return this._responders.get(id);
  }

  /**
   * 根据名称获取响应器
   */
  getResponderByName(name: string): DataResponderInstance | undefined {
    for (const instance of this._responders.values()) {
      if (instance.definition.name === name) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * 获取所有响应器定义
   */
  get definitions(): DataResponderDefinition[] {
    return this._definitions.value;
  }

  /**
   * 获取定义列表的信号，用于响应式订阅
   */
  get definitionsSignal(): ReadonlySignal<DataResponderDefinition[]> {
    return this._definitions;
  }

  /**
   * 启动所有响应器
   */
  startAll(): void {
    for (const instance of this._responders.values()) {
      if (instance.definition.enabled) {
        instance.start();
      }
    }
  }

  /**
   * 停止所有响应器
   */
  stopAll(): void {
    for (const instance of this._responders.values()) {
      instance.stop();
    }
  }

  /**
   * 重置所有响应器
   */
  resetAll(): void {
    for (const instance of this._responders.values()) {
      instance.reset();
    }
  }

  /**
   * 从响应器定义列表初始化
   */
  loadResponders(definitions: DataResponderDefinition[]): void {
    // 停止并清除现有响应器
    this.stopAll();
    this._responders.clear();
    this._definitions.value = [];

    // 添加新响应器（addResponder 会自动启动响应式监听）
    for (const definition of definitions) {
      this.addResponder(definition);
    }
  }

  /**
   * 获取所有暴露的值（用于表达式上下文）
   */
  getAllExposedValues(): Record<string, DataResponderExposedValues> {
    return this.exposedValues.value;
  }
}

/**
 * 创建 DataResponder 管理器
 */
export function createDataResponderManager(options?: {
  getContext?: () => Record<string, unknown>;
  evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
}): DataResponderManager {
  return new DataResponderManager(options);
}
