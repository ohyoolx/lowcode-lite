import { signal, computed, type Signal, type ReadonlySignal } from '../reactive/signals';
import type {
  QueryDefinition,
  QueryResult,
  QueryState,
  QueryExposedValues,
  RestApiConfig,
} from '@lowcode-lite/shared';
import { HttpClient, httpClient } from './httpClient';

/**
 * Query 实例 - 管理单个查询的状态和执行
 */
export class QueryInstance<T = unknown> {
  /** 查询定义 */
  readonly definition: QueryDefinition;

  /** 当前状态 */
  private _state: Signal<QueryState>;

  /** 是否正在加载 */
  private _isFetching: Signal<boolean>;

  /** 最后一次结果 */
  private _lastResult: Signal<QueryResult<T> | undefined>;

  /** HTTP 客户端 */
  private _httpClient: HttpClient;

  /** 表达式求值函数 */
  private _evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** 缓存数据 */
  private _cache?: {
    data: QueryResult<T>;
    expireAt: number;
  };

  constructor(
    definition: QueryDefinition,
    options?: {
      httpClient?: HttpClient;
      evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
      getContext?: () => Record<string, unknown>;
    }
  ) {
    this.definition = definition;
    this._httpClient = options?.httpClient ?? httpClient;
    this._evaluateExpression = options?.evaluateExpression;
    this._getContext = options?.getContext;

    this._state = signal<QueryState>('idle');
    this._isFetching = signal(false);
    this._lastResult = signal<QueryResult<T> | undefined>(undefined);
  }

  /** 获取当前状态 */
  get state(): QueryState {
    return this._state.value;
  }

  /** 是否正在加载 */
  get isFetching(): boolean {
    return this._isFetching.value;
  }

  /** 获取最后一次结果 */
  get lastResult(): QueryResult<T> | undefined {
    return this._lastResult.value;
  }

  /** 获取响应数据 */
  get data(): T | undefined {
    return this._lastResult.value?.data;
  }

  /** 获取错误信息 */
  get error(): string | undefined {
    return this._lastResult.value?.success === false
      ? this._lastResult.value.message
      : undefined;
  }

  /** 响应式状态 Signal */
  get stateSignal(): ReadonlySignal<QueryState> {
    return this._state;
  }

  /** 响应式加载状态 Signal */
  get isFetchingSignal(): ReadonlySignal<boolean> {
    return this._isFetching;
  }

  /** 响应式结果 Signal */
  get lastResultSignal(): ReadonlySignal<QueryResult<T> | undefined> {
    return this._lastResult;
  }

  /**
   * 执行查询
   * @param args 查询参数（用于表达式上下文）
   */
  async run(args?: Record<string, unknown>): Promise<QueryResult<T>> {
    // 检查缓存
    if (this._cache && Date.now() < this._cache.expireAt) {
      return this._cache.data;
    }

    // 设置加载状态
    this._state.value = 'loading';
    this._isFetching.value = true;

    try {
      let result: QueryResult<T>;

      switch (this.definition.type) {
        case 'restApi':
          result = await this._executeRestApi(args);
          break;

        case 'js':
          result = await this._executeJs(args);
          break;

        default:
          throw new Error(`Unsupported query type: ${this.definition.type}`);
      }

      // 更新状态
      this._state.value = result.success ? 'success' : 'error';
      this._isFetching.value = false;
      this._lastResult.value = result;

      // 设置缓存
      if (this.definition.cacheTime && this.definition.cacheTime > 0 && result.success) {
        this._cache = {
          data: result,
          expireAt: Date.now() + this.definition.cacheTime,
        };
      }

      return result;
    } catch (error) {
      const errorResult: QueryResult<T> = {
        success: false,
        data: undefined as T,
        message: error instanceof Error ? error.message : String(error),
        runTime: 0,
        timestamp: Date.now(),
      };

      this._state.value = 'error';
      this._isFetching.value = false;
      this._lastResult.value = errorResult;

      return errorResult;
    }
  }

  /**
   * 执行 REST API 查询
   */
  private async _executeRestApi(args?: Record<string, unknown>): Promise<QueryResult<T>> {
    const config = this.definition.config as RestApiConfig;
    const context = {
      ...(this._getContext?.() ?? {}),
      ...args,
    };

    return this._httpClient.executeRestApi<T>(
      config,
      this.definition.id,
      this._evaluateExpression,
      context
    );
  }

  /**
   * 执行 JS 查询
   */
  private async _executeJs(args?: Record<string, unknown>): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const config = this.definition.config as { code: string };

    try {
      const context = {
        ...(this._getContext?.() ?? {}),
        ...args,
      };

      // 在沙箱中执行 JS 代码
      // 注意：实际生产环境需要更安全的沙箱实现
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction('ctx', `with(ctx) { ${config.code} }`);
      const result = await fn(context);

      return {
        success: true,
        data: result as T,
        runTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        data: undefined as T,
        message: error instanceof Error ? error.message : String(error),
        runTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 取消正在进行的查询
   */
  cancel(): void {
    if (this.definition.type === 'restApi') {
      this._httpClient.cancel(this.definition.id);
    }
    this._isFetching.value = false;
    this._state.value = this._lastResult.value ? this._lastResult.value.success ? 'success' : 'error' : 'idle';
  }

  /**
   * 重置查询状态
   */
  reset(): void {
    this._state.value = 'idle';
    this._isFetching.value = false;
    this._lastResult.value = undefined;
    this._cache = undefined;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this._cache = undefined;
  }

  /**
   * 获取暴露的值（用于表达式上下文）
   */
  getExposedValues(): QueryExposedValues<T> {
    return {
      data: this.data,
      isFetching: this.isFetching,
      state: this.state,
      error: this.error,
      runTime: this.lastResult?.runTime,
      run: this.run.bind(this),
    };
  }
}

/**
 * Query 管理器 - 管理应用中所有的查询
 */
export class QueryManager {
  /** 查询实例映射 */
  private _queries: Map<string, QueryInstance<unknown>> = new Map();

  /** 查询定义列表 */
  private _definitions: Signal<QueryDefinition[]>;

  /** 表达式求值函数 */
  private _evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;

  /** 获取上下文函数 */
  private _getContext?: () => Record<string, unknown>;

  /** HTTP 客户端 */
  private _httpClient: HttpClient;

  /** 所有查询暴露的值（computed） */
  readonly exposedValues: ReadonlySignal<Record<string, QueryExposedValues<unknown>>>;

  constructor(options?: {
    httpClient?: HttpClient;
    evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
    getContext?: () => Record<string, unknown>;
  }) {
    this._httpClient = options?.httpClient ?? httpClient;
    this._evaluateExpression = options?.evaluateExpression;
    this._getContext = options?.getContext;
    this._definitions = signal<QueryDefinition[]>([]);

    // 计算所有暴露的值
    this.exposedValues = computed(() => {
      const result: Record<string, QueryExposedValues<unknown>> = {};
      for (const [id, instance] of this._queries) {
        // 使用 name 作为键，方便表达式引用
        result[instance.definition.name] = instance.getExposedValues();
      }
      return result;
    });
  }

  /**
   * 添加查询
   */
  addQuery(definition: QueryDefinition): QueryInstance<unknown> {
    const instance = new QueryInstance(definition, {
      httpClient: this._httpClient,
      evaluateExpression: this._evaluateExpression,
      getContext: this._getContext,
    });

    this._queries.set(definition.id, instance);
    this._definitions.value = [...this._definitions.value, definition];

    return instance;
  }

  /**
   * 更新查询定义
   */
  updateQuery(id: string, updates: Partial<QueryDefinition>): void {
    const instance = this._queries.get(id);
    if (!instance) return;

    // 创建新的定义
    const newDefinition: QueryDefinition = {
      ...instance.definition,
      ...updates,
    };

    // 创建新的实例
    const newInstance = new QueryInstance(newDefinition, {
      httpClient: this._httpClient,
      evaluateExpression: this._evaluateExpression,
      getContext: this._getContext,
    });

    this._queries.set(id, newInstance);
    this._definitions.value = this._definitions.value.map((d) =>
      d.id === id ? newDefinition : d
    );
  }

  /**
   * 删除查询
   */
  removeQuery(id: string): void {
    const instance = this._queries.get(id);
    if (instance) {
      instance.cancel();
      this._queries.delete(id);
      this._definitions.value = this._definitions.value.filter((d) => d.id !== id);
    }
  }

  /**
   * 获取查询实例
   */
  getQuery(id: string): QueryInstance<unknown> | undefined {
    return this._queries.get(id);
  }

  /**
   * 根据名称获取查询
   */
  getQueryByName(name: string): QueryInstance<unknown> | undefined {
    for (const instance of this._queries.values()) {
      if (instance.definition.name === name) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * 获取所有查询定义
   */
  get definitions(): QueryDefinition[] {
    return this._definitions.value;
  }

  /**
   * 执行指定查询
   */
  async runQuery(idOrName: string, args?: Record<string, unknown>): Promise<QueryResult<unknown>> {
    const instance = this._queries.get(idOrName) ?? this.getQueryByName(idOrName);
    if (!instance) {
      return {
        success: false,
        data: undefined,
        message: `Query not found: ${idOrName}`,
        runTime: 0,
        timestamp: Date.now(),
      };
    }
    return instance.run(args);
  }

  /**
   * 执行所有 runOnInit 的查询
   */
  async runInitQueries(): Promise<void> {
    const initQueries = Array.from(this._queries.values()).filter(
      (q) => q.definition.runOnInit
    );

    await Promise.all(initQueries.map((q) => q.run()));
  }

  /**
   * 取消所有查询
   */
  cancelAll(): void {
    for (const instance of this._queries.values()) {
      instance.cancel();
    }
  }

  /**
   * 重置所有查询
   */
  resetAll(): void {
    for (const instance of this._queries.values()) {
      instance.reset();
    }
  }

  /**
   * 从查询定义列表初始化
   */
  loadQueries(definitions: QueryDefinition[]): void {
    // 清除现有查询
    this._queries.clear();
    this._definitions.value = [];

    // 添加新查询
    for (const definition of definitions) {
      this.addQuery(definition);
    }
  }

  /**
   * 获取所有暴露的值（用于表达式上下文）
   */
  getAllExposedValues(): Record<string, QueryExposedValues<unknown>> {
    return this.exposedValues.value;
  }
}

/**
 * 创建 Query 管理器
 */
export function createQueryManager(options?: {
  httpClient?: HttpClient;
  evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown;
  getContext?: () => Record<string, unknown>;
}): QueryManager {
  return new QueryManager(options);
}
