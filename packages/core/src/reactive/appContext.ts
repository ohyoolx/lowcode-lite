import { signal, computed, type Signal, type ReadonlySignal } from './signals';
import type { AppData, PageData, ComponentData, QueryDefinition, TempStateDefinition, TransformerDefinition, DataResponderDefinition } from '@lowcode-lite/shared';
import { createDefaultAppSchema, generateId, createDefaultRestApiQuery, createDefaultTempState, createDefaultTransformer, createDefaultDataResponder } from '@lowcode-lite/shared';
import { CompInstance } from '../components/compInstance';
import { componentRegistry } from '../components/registry';
import type { CompDefinition } from '@lowcode-lite/shared';
import { QueryManager, createQueryManager } from '../datasource/queryManager';
import { TempStateManager, createTempStateManager } from '../datasource/tempStateManager';
import { TransformerManager, createTransformerManager } from '../datasource/transformerManager';
import { DataResponderManager, createDataResponderManager } from '../datasource/dataResponderManager';
import { evaluatePureExpr } from '../expression/evaluator';

/**
 * 历史记录项
 */
export interface HistoryEntry {
  schema: AppData;
  timestamp: number;
  description?: string;
}

/**
 * 历史记录展示项（不包含完整 schema，用于 UI 展示）
 */
export interface HistoryDisplayItem {
  index: number;
  timestamp: number;
  description: string;
  type: 'undo' | 'redo';
}

/**
 * 历史记录管理器
 */
class HistoryManager {
  private _past: HistoryEntry[] = [];
  private _future: HistoryEntry[] = [];
  private _maxSize: number;
  
  // Signals for reactive UI
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;
  
  constructor(maxSize = 50) {
    this._maxSize = maxSize;
    this.canUndo = signal(false);
    this.canRedo = signal(false);
  }
  
  /**
   * 记录当前状态
   */
  push(schema: AppData, description?: string) {
    this._past.push({
      schema: JSON.parse(JSON.stringify(schema)), // Deep clone
      timestamp: Date.now(),
      description,
    });
    
    // 清空未来历史
    this._future = [];
    
    // 限制历史大小
    if (this._past.length > this._maxSize) {
      this._past.shift();
    }
    
    this._updateSignals();
  }
  
  /**
   * 撤销
   */
  undo(currentSchema: AppData): AppData | null {
    if (this._past.length === 0) return null;
    
    const previous = this._past.pop()!;
    
    // 当前状态放入 future
    this._future.push({
      schema: JSON.parse(JSON.stringify(currentSchema)),
      timestamp: Date.now(),
    });
    
    this._updateSignals();
    return previous.schema;
  }
  
  /**
   * 重做
   */
  redo(currentSchema: AppData): AppData | null {
    if (this._future.length === 0) return null;
    
    const next = this._future.pop()!;
    
    // 当前状态放入 past
    this._past.push({
      schema: JSON.parse(JSON.stringify(currentSchema)),
      timestamp: Date.now(),
    });
    
    this._updateSignals();
    return next.schema;
  }
  
  /**
   * 清空历史
   */
  clear() {
    this._past = [];
    this._future = [];
    this._updateSignals();
  }
  
  private _updateSignals() {
    this.canUndo.value = this._past.length > 0;
    this.canRedo.value = this._future.length > 0;
  }
  
  get undoCount() {
    return this._past.length;
  }
  
  get redoCount() {
    return this._future.length;
  }
  
  /**
   * 获取撤销历史列表（用于 UI 展示）
   */
  getUndoList(): HistoryDisplayItem[] {
    return this._past.map((entry, index) => ({
      index,
      timestamp: entry.timestamp,
      description: entry.description ?? '未命名操作',
      type: 'undo' as const,
    })).reverse(); // 最新的在前面
  }
  
  /**
   * 获取重做历史列表（用于 UI 展示）
   */
  getRedoList(): HistoryDisplayItem[] {
    return this._future.map((entry, index) => ({
      index,
      timestamp: entry.timestamp,
      description: entry.description ?? '未命名操作',
      type: 'redo' as const,
    })).reverse(); // 最新的在前面
  }
}

/**
 * 应用上下文 - 管理整个应用的状态
 */
export class AppContext {
  // 应用 Schema
  private _schema: Signal<AppData>;
  
  // 当前页面 ID
  private _currentPageId: Signal<string>;
  
  // 组件实例映射（使用 Signal 包装，实现响应式追踪）
  private _components: Signal<Map<string, CompInstance<any>>>;
  
  // Query 管理器
  readonly queryManager: QueryManager;
  
  // TempState 管理器
  readonly tempStateManager: TempStateManager;
  
  // Transformer 管理器
  readonly transformerManager: TransformerManager;
  
  // DataResponder 管理器
  readonly dataResponderManager: DataResponderManager;
  
  // 所有组件暴露的值（用于表达式上下文）
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
  
  // 当前页面（computed）- 用于响应式追踪
  private _currentPage: ReadonlySignal<PageData | undefined>;
  
  // 查询列表（computed）- 用于响应式追踪
  private _queries: ReadonlySignal<QueryDefinition[]>;
  
  // 临时状态列表（computed）- 用于响应式追踪
  private _tempStates: ReadonlySignal<TempStateDefinition[]>;
  
  // 转换器列表（computed）- 用于响应式追踪
  private _transformers: ReadonlySignal<TransformerDefinition[]>;
  
  // 数据响应器列表（computed）- 用于响应式追踪
  private _dataResponders: ReadonlySignal<DataResponderDefinition[]>;
  
  // 历史记录管理器
  readonly history: HistoryManager;
  
  // 是否正在批量操作（避免重复记录历史）
  private _isBatching = false;
  
  constructor(initialSchema?: AppData) {
    this._schema = signal(initialSchema ?? createDefaultAppSchema());
    this._currentPageId = signal(this._schema.value.pages[0]?.id ?? '');
    this._components = signal(new Map<string, CompInstance<any>>());
    this.history = new HistoryManager(50);
    
    // 创建 QueryManager，并注入表达式求值和上下文获取函数
    this.queryManager = createQueryManager({
      getContext: () => this.getExpressionContext(),
    });
    
    // 创建 TempStateManager
    this.tempStateManager = createTempStateManager();
    
    // 创建 TransformerManager
    this.transformerManager = createTransformerManager({
      getContext: () => this.getExpressionContext(),
    });
    
    // 创建 DataResponderManager
    this.dataResponderManager = createDataResponderManager({
      getContext: () => this.getExpressionContext(),
      evaluateExpression: (expr, context) => evaluatePureExpr(expr, context),
    });
    
    // 计算当前页面（响应式）
    this._currentPage = computed(() => {
      return this._schema.value.pages.find(p => p.id === this._currentPageId.value);
    });
    
    // 计算查询列表（响应式）
    this._queries = computed(() => {
      return this._schema.value.queries ?? [];
    });
    
    // 计算临时状态列表（响应式）
    this._tempStates = computed(() => {
      return this._schema.value.tempStates ?? [];
    });
    
    // 计算转换器列表（响应式）
    this._transformers = computed(() => {
      return this._schema.value.transformers ?? [];
    });
    
    // 计算数据响应器列表（响应式）
    this._dataResponders = computed(() => {
      return this._schema.value.dataResponders ?? [];
    });
    
    // 计算所有暴露的值（包含组件、查询、临时状态、转换器和数据响应器）
    // 通过订阅 _components Signal，当组件列表变化时自动重新计算
    // 注意：必须在加载数据源之前创建，因为 getExpressionContext() 依赖这个值
    this.exposedValues = computed(() => {
      const components = this._components.value;
      const result: Record<string, any> = {};
      
      // 组件暴露值（通过 nameSignal.value 订阅名称变化）
      for (const [, instance] of components) {
        // 访问 nameSignal.value 来订阅名称变化
        const name = instance.nameSignal.value;
        result[name] = instance.exposedValues.value;
      }
      
      // 查询暴露值 - 订阅 exposedValues signal 以触发响应式更新
      const queryValues = this.queryManager.exposedValues.value;
      for (const [name, values] of Object.entries(queryValues)) {
        result[name] = values;
      }
      
      // 临时状态暴露值 - 订阅 exposedValues signal 以触发响应式更新
      const tempStateValues = this.tempStateManager.exposedValues.value;
      for (const [name, values] of Object.entries(tempStateValues)) {
        result[name] = values;
      }
      
      // 转换器暴露值 - 订阅 exposedValues signal 以触发响应式更新
      const transformerValues = this.transformerManager.exposedValues.value;
      for (const [name, values] of Object.entries(transformerValues)) {
        result[name] = values;
      }
      
      // 数据响应器暴露值 - 订阅 exposedValues signal 以触发响应式更新
      const responderValues = this.dataResponderManager.exposedValues.value;
      for (const [name, values] of Object.entries(responderValues)) {
        result[name] = values;
      }
      
      return result;
    });
    
    // 加载初始查询（必须在 exposedValues 创建之后）
    if (this._schema.value.queries) {
      this.queryManager.loadQueries(this._schema.value.queries);
    }
    
    // 加载初始临时状态
    if (this._schema.value.tempStates) {
      this.tempStateManager.loadStates(this._schema.value.tempStates);
    }
    
    // 加载初始转换器（不会立即计算，避免循环依赖）
    if (this._schema.value.transformers) {
      this.transformerManager.loadTransformers(this._schema.value.transformers);
    }
    
    // 初始化组件实例（从初始 schema 加载）
    // 注意：必须在加载 DataResponder 之前执行，这样 exposedValues 中才有组件数据
    this._rebuildComponents();
    
    // 加载初始数据响应器（必须在组件初始化之后，这样 exposedValues 中才有组件数据）
    if (this._schema.value.dataResponders) {
      this.dataResponderManager.loadResponders(this._schema.value.dataResponders);
    }
    
    // 在所有数据加载完成后，触发 Transformer 的初始计算
    // 使用 setTimeout 确保在当前调用栈结束后执行，避免 computed 循环依赖
    setTimeout(() => {
      this.transformerManager.computeAll();
    }, 0);
  }
  
  /**
   * 获取表达式求值上下文
   */
  getExpressionContext(): Record<string, any> {
    return this.exposedValues.value;
  }
  
  /**
   * 获取应用 Schema
   */
  get schema(): AppData {
    return this._schema.value;
  }
  
  /**
   * 更新应用 Schema（带历史记录）
   */
  updateSchema(updater: (schema: AppData) => AppData, description?: string) {
    // 记录变更前的状态
    if (!this._isBatching) {
      this.history.push(this._schema.value, description);
    }
    this._schema.value = updater(this._schema.value);
  }
  
  /**
   * 批量操作（只记录一次历史）
   */
  batch(fn: () => void, description?: string) {
    this.history.push(this._schema.value, description);
    this._isBatching = true;
    try {
      fn();
    } finally {
      this._isBatching = false;
    }
  }
  
  /**
   * 撤销
   */
  undo(): boolean {
    const previousSchema = this.history.undo(this._schema.value);
    if (previousSchema) {
      this._schema.value = previousSchema;
      this._rebuildComponents();
      return true;
    }
    return false;
  }
  
  /**
   * 重做
   */
  redo(): boolean {
    const nextSchema = this.history.redo(this._schema.value);
    if (nextSchema) {
      this._schema.value = nextSchema;
      this._rebuildComponents();
      return true;
    }
    return false;
  }
  
  /**
   * 重建组件实例
   */
  private _rebuildComponents() {
    const newComponents = new Map<string, CompInstance<any>>();
    
    for (const page of this._schema.value.pages) {
      for (const compData of page.components) {
        const definition = componentRegistry.get(compData.type);
        if (definition) {
          const instance = new CompInstance(definition, compData, this);
          newComponents.set(compData.id, instance);
        }
      }
    }
    
    // 更新整个 Map 引用，触发 Signal 更新
    this._components.value = newComponents;
  }
  
  /**
   * 获取当前页面（响应式）
   */
  get currentPage(): PageData | undefined {
    return this._currentPage.value;
  }
  
  /**
   * 切换页面
   */
  setCurrentPage(pageId: string) {
    this._currentPageId.value = pageId;
  }
  
  /**
   * 获取组件定义（使用全局注册表）
   */
  getComponentDefinition(type: string): CompDefinition<any> | undefined {
    return componentRegistry.get(type);
  }
  
  /**
   * 获取所有已注册的组件
   */
  getRegisteredComponents(): CompDefinition<any>[] {
    return componentRegistry.getAll();
  }
  
  /**
   * 创建组件实例
   */
  createComponentInstance(data: ComponentData): CompInstance<any> | undefined {
    const definition = componentRegistry.get(data.type);
    if (!definition) {
      console.warn(`Component type not found: ${data.type}`);
      return undefined;
    }
    
    const instance = new CompInstance(definition, data, this);
    
    // 创建新的 Map 并添加新实例，触发 Signal 更新
    const newComponents = new Map(this._components.value);
    newComponents.set(data.id, instance);
    this._components.value = newComponents;
    
    return instance;
  }
  
  /**
   * 获取组件实例
   */
  getComponent(id: string): CompInstance<any> | undefined {
    return this._components.value.get(id);
  }
  
  /**
   * 根据名称获取组件
   */
  getComponentByName(name: string): CompInstance<any> | undefined {
    for (const instance of this._components.value.values()) {
      if (instance.name === name) {
        return instance;
      }
    }
    return undefined;
  }
  
  /**
   * 删除组件实例
   */
  removeComponent(id: string) {
    // 创建新的 Map 并删除实例，触发 Signal 更新
    const newComponents = new Map(this._components.value);
    newComponents.delete(id);
    this._components.value = newComponents;
  }
  
  /**
   * 获取所有暴露值（用于表达式上下文）
   */
  getAllExposedValues(): Record<string, any> {
    return this.exposedValues.value;
  }
  
  /**
   * 添加组件到当前页面
   * @param componentData 组件数据
   * @param parentId 父组件 ID（如果要添加到容器内部）
   */
  addComponent(componentData: ComponentData, parentId?: string) {
    this.updateSchema(schema => {
      const pageIndex = schema.pages.findIndex(p => p.id === this._currentPageId.value);
      if (pageIndex === -1) return schema;
      
      const newPages = [...schema.pages];
      
      if (parentId) {
        // 添加到容器内部
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          components: this._addToParent(newPages[pageIndex].components, parentId, componentData),
        };
      } else {
        // 添加到页面根级别
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          components: [...newPages[pageIndex].components, componentData],
        };
      }
      
      return { ...schema, pages: newPages };
    }, `添加组件 ${componentData.name}`);
    
    // 创建实例
    this.createComponentInstance(componentData);
  }
  
  /**
   * 递归查找父组件并添加子组件
   */
  private _addToParent(components: ComponentData[], parentId: string, child: ComponentData): ComponentData[] {
    return components.map(comp => {
      if (comp.id === parentId) {
        // 找到父组件，添加子组件
        return {
          ...comp,
          children: [...(comp.children ?? []), child],
        };
      }
      // 递归查找
      if (comp.children && comp.children.length > 0) {
        return {
          ...comp,
          children: this._addToParent(comp.children, parentId, child),
        };
      }
      return comp;
    });
  }
  
  /**
   * 更新组件（支持嵌套）
   * @param id 组件 ID
   * @param updates 更新内容
   * @param recordHistory 是否记录历史，默认 true
   */
  updateComponent(id: string, updates: Partial<ComponentData>, recordHistory = true) {
    const instance = this._components.value.get(id);
    
    // 如果更新了组件名称，同步更新组件实例
    if (updates.name && instance) {
      instance.updateName(updates.name);
    }
    
    // 如果更新了 props，同步更新组件实例的 CompState
    // 这样 exposedValues 会自动更新，其他订阅该值的组件也会更新
    if (updates.props && instance) {
      for (const [key, value] of Object.entries(updates.props)) {
        instance.setPropFromExternal(key, value);
      }
    }
    
    if (recordHistory) {
      this.updateSchema(schema => {
        const pageIndex = schema.pages.findIndex(p => p.id === this._currentPageId.value);
        if (pageIndex === -1) return schema;
        
        const newPages = [...schema.pages];
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          components: this._updateInTree(newPages[pageIndex].components, id, updates),
        };
        
        return { ...schema, pages: newPages };
      }, '更新组件');
    } else {
      // 不记录历史的更新（用于拖拽过程中的实时更新）
      const schema = this._schema.value;
      const pageIndex = schema.pages.findIndex(p => p.id === this._currentPageId.value);
      if (pageIndex === -1) return;
      
      const newPages = [...schema.pages];
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        components: this._updateInTree(newPages[pageIndex].components, id, updates),
      };
      
      this._schema.value = { ...schema, pages: newPages };
    }
  }
  
  /**
   * 记录当前状态到历史（用于拖拽结束时手动记录）
   */
  recordHistory(description?: string) {
    this.history.push(this._schema.value, description);
  }
  
  /**
   * 递归更新组件树中的组件
   */
  private _updateInTree(components: ComponentData[], id: string, updates: Partial<ComponentData>): ComponentData[] {
    return components.map(comp => {
      if (comp.id === id) {
        return { ...comp, ...updates };
      }
      if (comp.children && comp.children.length > 0) {
        return {
          ...comp,
          children: this._updateInTree(comp.children, id, updates),
        };
      }
      return comp;
    });
  }
  
  /**
   * 删除组件（支持嵌套）
   */
  deleteComponent(id: string) {
    const comp = this.findComponent(id);
    this.updateSchema(schema => {
      const pageIndex = schema.pages.findIndex(p => p.id === this._currentPageId.value);
      if (pageIndex === -1) return schema;
      
      const newPages = [...schema.pages];
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        components: this._deleteFromTree(newPages[pageIndex].components, id),
      };
      
      return { ...schema, pages: newPages };
    }, `删除组件 ${comp?.name ?? id}`);
    
    this.removeComponent(id);
  }
  
  /**
   * 移动组件到新的父容器
   * @param id 要移动的组件 ID
   * @param newParentId 新的父容器 ID（undefined 表示移动到根级别）
   * @param newPosition 新的位置（可选，如果不提供则保持原位置）
   */
  moveComponent(id: string, newParentId?: string, newPosition?: { x: number; y: number }) {
    const comp = this.findComponent(id);
    if (!comp) return;
    
    // 先从原位置删除
    this.updateSchema(schema => {
      const pageIndex = schema.pages.findIndex(p => p.id === this._currentPageId.value);
      if (pageIndex === -1) return schema;
      
      // 更新组件位置
      const updatedComp: ComponentData = {
        ...comp,
        position: newPosition 
          ? { ...comp.position, x: newPosition.x, y: newPosition.y }
          : comp.position,
      };
      
      const newPages = [...schema.pages];
      
      // 先从原位置删除
      newPages[pageIndex] = {
        ...newPages[pageIndex],
        components: this._deleteFromTree(newPages[pageIndex].components, id),
      };
      
      // 再添加到新位置
      if (newParentId) {
        // 添加到新的父容器
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          components: this._addToParent(newPages[pageIndex].components, newParentId, updatedComp),
        };
      } else {
        // 添加到根级别
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          components: [...newPages[pageIndex].components, updatedComp],
        };
      }
      
      return { ...schema, pages: newPages };
    }, `移动组件 ${comp.name}`);
  }
  
  /**
   * 递归从组件树中删除组件
   */
  private _deleteFromTree(components: ComponentData[], id: string): ComponentData[] {
    return components
      .filter(comp => comp.id !== id)
      .map(comp => {
        if (comp.children && comp.children.length > 0) {
          return {
            ...comp,
            children: this._deleteFromTree(comp.children, id),
          };
        }
        return comp;
      });
  }
  
  /**
   * 在组件树中查找组件
   */
  findComponent(id: string, components?: ComponentData[]): ComponentData | undefined {
    const comps = components ?? this.currentPage?.components ?? [];
    for (const comp of comps) {
      if (comp.id === id) return comp;
      if (comp.children && comp.children.length > 0) {
        const found = this.findComponent(id, comp.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  
  /**
   * 获取所有组件（扁平化，包括嵌套的）
   */
  getAllComponents(components?: ComponentData[]): ComponentData[] {
    const comps = components ?? this.currentPage?.components ?? [];
    const result: ComponentData[] = [];
    for (const comp of comps) {
      result.push(comp);
      if (comp.children && comp.children.length > 0) {
        result.push(...this.getAllComponents(comp.children));
      }
    }
    return result;
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): AppData {
    return this._schema.value;
  }
  
  /**
   * 从 JSON 加载
   */
  fromJSON(data: AppData) {
    this._schema.value = data;
    this._currentPageId.value = data.pages[0]?.id ?? '';
    
    // 清除历史和重建组件实例
    this.history.clear();
    this._rebuildComponents();
    
    // 加载查询
    if (data.queries) {
      this.queryManager.loadQueries(data.queries);
    }
    
    // 加载临时状态
    if (data.tempStates) {
      this.tempStateManager.loadStates(data.tempStates);
    }
    
    // 加载转换器
    if (data.transformers) {
      this.transformerManager.loadTransformers(data.transformers);
    }
    
    // 加载数据响应器
    if (data.dataResponders) {
      this.dataResponderManager.loadResponders(data.dataResponders);
    }
  }
  
  // ==================== Query 相关方法 ====================
  
  /**
   * 获取所有查询定义（通过 computed 信号实现响应式）
   */
  get queries(): QueryDefinition[] {
    return this._queries.value;
  }
  
  /**
   * 获取查询列表的信号，用于在组件中直接订阅
   */
  get queriesSignal(): ReadonlySignal<QueryDefinition[]> {
    return this._queries;
  }
  
  /**
   * 添加查询
   */
  addQuery(query: QueryDefinition) {
    this.updateSchema(schema => ({
      ...schema,
      queries: [...(schema.queries ?? []), query],
    }), `添加查询 ${query.name}`);
    
    // 添加到 QueryManager
    this.queryManager.addQuery(query);
  }
  
  /**
   * 创建新的 REST API 查询
   */
  createRestApiQuery(name?: string): QueryDefinition {
    const id = generateId();
    const queryName = name ?? `query${(this._schema.value.queries?.length ?? 0) + 1}`;
    const query = createDefaultRestApiQuery(id, queryName);
    this.addQuery(query);
    return query;
  }
  
  /**
   * 更新查询
   */
  updateQuery(id: string, updates: Partial<QueryDefinition>) {
    this.updateSchema(schema => ({
      ...schema,
      queries: (schema.queries ?? []).map(q => 
        q.id === id ? { ...q, ...updates } : q
      ),
    }), '更新查询');
    
    // 更新 QueryManager
    this.queryManager.updateQuery(id, updates);
  }
  
  /**
   * 删除查询
   */
  deleteQuery(id: string) {
    const query = this._schema.value.queries?.find(q => q.id === id);
    this.updateSchema(schema => ({
      ...schema,
      queries: (schema.queries ?? []).filter(q => q.id !== id),
    }), `删除查询 ${query?.name ?? id}`);
    
    // 从 QueryManager 中删除
    this.queryManager.removeQuery(id);
  }
  
  /**
   * 获取查询
   */
  getQuery(id: string): QueryDefinition | undefined {
    return this._schema.value.queries?.find(q => q.id === id);
  }
  
  /**
   * 根据名称获取查询
   */
  getQueryByName(name: string): QueryDefinition | undefined {
    return this._schema.value.queries?.find(q => q.name === name);
  }
  
  /**
   * 执行查询
   */
  async runQuery(idOrName: string, args?: Record<string, unknown>) {
    return this.queryManager.runQuery(idOrName, args);
  }
  
  /**
   * 执行所有初始化查询
   */
  async runInitQueries() {
    return this.queryManager.runInitQueries();
  }
  
  // ==================== TempState 相关方法 ====================
  
  /**
   * 获取所有临时状态定义（通过 computed 信号实现响应式）
   */
  get tempStates(): TempStateDefinition[] {
    return this._tempStates.value;
  }
  
  /**
   * 获取临时状态列表的信号，用于在组件中直接订阅
   */
  get tempStatesSignal(): ReadonlySignal<TempStateDefinition[]> {
    return this._tempStates;
  }
  
  /**
   * 添加临时状态
   */
  addTempState(state: TempStateDefinition) {
    this.updateSchema(schema => ({
      ...schema,
      tempStates: [...(schema.tempStates ?? []), state],
    }), `添加状态 ${state.name}`);
    
    // 添加到 TempStateManager
    this.tempStateManager.addState(state);
  }
  
  /**
   * 创建新的临时状态
   */
  createTempState(name?: string): TempStateDefinition {
    const id = generateId();
    const stateName = name ?? `state${(this._schema.value.tempStates?.length ?? 0) + 1}`;
    const state = createDefaultTempState(id, stateName);
    this.addTempState(state);
    return state;
  }
  
  /**
   * 更新临时状态
   */
  updateTempState(id: string, updates: Partial<TempStateDefinition>) {
    this.updateSchema(schema => ({
      ...schema,
      tempStates: (schema.tempStates ?? []).map(s => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }), '更新状态');
    
    // 更新 TempStateManager
    this.tempStateManager.updateState(id, updates);
  }
  
  /**
   * 删除临时状态
   */
  deleteTempState(id: string) {
    const state = this._schema.value.tempStates?.find(s => s.id === id);
    this.updateSchema(schema => ({
      ...schema,
      tempStates: (schema.tempStates ?? []).filter(s => s.id !== id),
    }), `删除状态 ${state?.name ?? id}`);
    
    // 从 TempStateManager 中删除
    this.tempStateManager.removeState(id);
  }
  
  /**
   * 获取临时状态
   */
  getTempState(id: string): TempStateDefinition | undefined {
    return this._schema.value.tempStates?.find(s => s.id === id);
  }
  
  /**
   * 根据名称获取临时状态
   */
  getTempStateByName(name: string): TempStateDefinition | undefined {
    return this._schema.value.tempStates?.find(s => s.name === name);
  }
  
  /**
   * 设置临时状态的值
   */
  setTempStateValue(idOrName: string, value: unknown) {
    this.tempStateManager.setValue(idOrName, value);
  }
  
  /**
   * 获取临时状态的值
   */
  getTempStateValue(idOrName: string): unknown {
    return this.tempStateManager.getValue(idOrName);
  }
  
  // ==================== Transformer 相关方法 ====================
  
  /**
   * 获取所有转换器定义（通过 computed 信号实现响应式）
   */
  get transformers(): TransformerDefinition[] {
    return this._transformers.value;
  }
  
  /**
   * 获取转换器列表的信号，用于在组件中直接订阅
   */
  get transformersSignal(): ReadonlySignal<TransformerDefinition[]> {
    return this._transformers;
  }
  
  /**
   * 添加转换器
   */
  addTransformer(transformer: TransformerDefinition) {
    this.updateSchema(schema => ({
      ...schema,
      transformers: [...(schema.transformers ?? []), transformer],
    }), `添加转换器 ${transformer.name}`);
    
    // 添加到 TransformerManager
    this.transformerManager.addTransformer(transformer);
  }
  
  /**
   * 创建新的转换器
   */
  createTransformer(name?: string): TransformerDefinition {
    const id = generateId();
    const transformerName = name ?? `transformer${(this._schema.value.transformers?.length ?? 0) + 1}`;
    const transformer = createDefaultTransformer(id, transformerName);
    this.addTransformer(transformer);
    return transformer;
  }
  
  /**
   * 更新转换器
   */
  updateTransformer(id: string, updates: Partial<TransformerDefinition>) {
    this.updateSchema(schema => ({
      ...schema,
      transformers: (schema.transformers ?? []).map(t => 
        t.id === id ? { ...t, ...updates } : t
      ),
    }), '更新转换器');
    
    // 更新 TransformerManager
    this.transformerManager.updateTransformer(id, updates);
  }
  
  /**
   * 删除转换器
   */
  deleteTransformer(id: string) {
    const transformer = this._schema.value.transformers?.find(t => t.id === id);
    this.updateSchema(schema => ({
      ...schema,
      transformers: (schema.transformers ?? []).filter(t => t.id !== id),
    }), `删除转换器 ${transformer?.name ?? id}`);
    
    // 从 TransformerManager 中删除
    this.transformerManager.removeTransformer(id);
  }
  
  /**
   * 获取转换器
   */
  getTransformer(id: string): TransformerDefinition | undefined {
    return this._schema.value.transformers?.find(t => t.id === id);
  }
  
  /**
   * 根据名称获取转换器
   */
  getTransformerByName(name: string): TransformerDefinition | undefined {
    return this._schema.value.transformers?.find(t => t.name === name);
  }
  
  /**
   * 刷新指定转换器
   */
  refreshTransformer(idOrName: string) {
    const instance = this.transformerManager.getTransformer(idOrName) ?? 
                     this.transformerManager.getTransformerByName(idOrName);
    instance?.refresh();
  }
  
  /**
   * 刷新所有转换器
   */
  refreshAllTransformers() {
    this.transformerManager.computeAll();
  }
  
  // ==================== DataResponder 相关方法 ====================
  
  /**
   * 获取所有数据响应器定义（通过 computed 信号实现响应式）
   */
  get dataResponders(): DataResponderDefinition[] {
    return this._dataResponders.value;
  }
  
  /**
   * 获取数据响应器列表的信号，用于在组件中直接订阅
   */
  get dataRespondersSignal(): ReadonlySignal<DataResponderDefinition[]> {
    return this._dataResponders;
  }
  
  /**
   * 添加数据响应器
   */
  addDataResponder(responder: DataResponderDefinition) {
    this.updateSchema(schema => ({
      ...schema,
      dataResponders: [...(schema.dataResponders ?? []), responder],
    }), `添加响应器 ${responder.name}`);
    
    // 添加到 DataResponderManager
    this.dataResponderManager.addResponder(responder);
  }
  
  /**
   * 创建新的数据响应器
   */
  createDataResponder(name?: string): DataResponderDefinition {
    const id = generateId();
    const responderName = name ?? `responder${(this._schema.value.dataResponders?.length ?? 0) + 1}`;
    const responder = createDefaultDataResponder(id, responderName);
    this.addDataResponder(responder);
    return responder;
  }
  
  /**
   * 更新数据响应器
   */
  updateDataResponder(id: string, updates: Partial<DataResponderDefinition>) {
    this.updateSchema(schema => ({
      ...schema,
      dataResponders: (schema.dataResponders ?? []).map(r => 
        r.id === id ? { ...r, ...updates } : r
      ),
    }), '更新响应器');
    
    // 更新 DataResponderManager
    this.dataResponderManager.updateResponder(id, updates);
  }
  
  /**
   * 删除数据响应器
   */
  deleteDataResponder(id: string) {
    const responder = this._schema.value.dataResponders?.find(r => r.id === id);
    this.updateSchema(schema => ({
      ...schema,
      dataResponders: (schema.dataResponders ?? []).filter(r => r.id !== id),
    }), `删除响应器 ${responder?.name ?? id}`);
    
    // 从 DataResponderManager 中删除
    this.dataResponderManager.removeResponder(id);
  }
  
  /**
   * 获取数据响应器
   */
  getDataResponder(id: string): DataResponderDefinition | undefined {
    return this._schema.value.dataResponders?.find(r => r.id === id);
  }
  
  /**
   * 根据名称获取数据响应器
   */
  getDataResponderByName(name: string): DataResponderDefinition | undefined {
    return this._schema.value.dataResponders?.find(r => r.name === name);
  }
  
  /**
   * 触发指定数据响应器
   */
  triggerDataResponder(idOrName: string) {
    const instance = this.dataResponderManager.getResponder(idOrName) ?? 
                     this.dataResponderManager.getResponderByName(idOrName);
    instance?.trigger();
  }
  
  /**
   * 启动所有数据响应器
   */
  startAllDataResponders() {
    this.dataResponderManager.startAll();
  }
  
  /**
   * 停止所有数据响应器
   */
  stopAllDataResponders() {
    this.dataResponderManager.stopAll();
  }
}

/**
 * 创建应用上下文
 */
export function createAppContext(initialSchema?: AppData): AppContext {
  return new AppContext(initialSchema);
}
