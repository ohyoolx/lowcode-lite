import { signal, computed, type Signal, type ReadonlySignal } from './signals';
import type { AppData, PageData, ComponentData, QueryDefinition } from '@lowcode-lite/shared';
import { createDefaultAppSchema, generateId, createDefaultRestApiQuery } from '@lowcode-lite/shared';
import { CompInstance } from '../components/compInstance';
import { componentRegistry } from '../components/registry';
import type { CompDefinition, PropDefs } from '@lowcode-lite/shared';
import { QueryManager, createQueryManager } from '../datasource/queryManager';

/**
 * 历史记录项
 */
interface HistoryEntry {
  schema: AppData;
  timestamp: number;
  description?: string;
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
}

/**
 * 应用上下文 - 管理整个应用的状态
 */
export class AppContext {
  // 应用 Schema
  private _schema: Signal<AppData>;
  
  // 当前页面 ID
  private _currentPageId: Signal<string>;
  
  // 组件实例映射
  private _components: Map<string, CompInstance<any>> = new Map();
  
  // Query 管理器
  readonly queryManager: QueryManager;
  
  // 所有组件暴露的值（用于表达式上下文）
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
  
  // 当前页面（computed）- 用于响应式追踪
  private _currentPage: ReadonlySignal<PageData | undefined>;
  
  // 查询列表（computed）- 用于响应式追踪
  private _queries: ReadonlySignal<QueryDefinition[]>;
  
  // 历史记录管理器
  readonly history: HistoryManager;
  
  // 是否正在批量操作（避免重复记录历史）
  private _isBatching = false;
  
  constructor(initialSchema?: AppData) {
    this._schema = signal(initialSchema ?? createDefaultAppSchema());
    this._currentPageId = signal(this._schema.value.pages[0]?.id ?? '');
    this.history = new HistoryManager(50);
    
    // 创建 QueryManager，并注入表达式求值和上下文获取函数
    this.queryManager = createQueryManager({
      getContext: () => this.getExpressionContext(),
    });
    
    // 加载初始查询
    if (this._schema.value.queries) {
      this.queryManager.loadQueries(this._schema.value.queries);
    }
    
    // 计算当前页面（响应式）
    this._currentPage = computed(() => {
      return this._schema.value.pages.find(p => p.id === this._currentPageId.value);
    });
    
    // 计算查询列表（响应式）
    this._queries = computed(() => {
      return this._schema.value.queries ?? [];
    });
    
    // 计算所有暴露的值（包含组件和查询）
    this.exposedValues = computed(() => {
      const result: Record<string, any> = {};
      // 组件暴露值
      for (const [id, instance] of this._components) {
        result[instance.name] = instance.exposedValues.value;
      }
      // 查询暴露值
      const queryValues = this.queryManager.getAllExposedValues();
      for (const [name, values] of Object.entries(queryValues)) {
        result[name] = values;
      }
      return result;
    });
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
    this._components.clear();
    for (const page of this._schema.value.pages) {
      for (const compData of page.components) {
        this.createComponentInstance(compData);
      }
    }
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
    this._components.set(data.id, instance);
    return instance;
  }
  
  /**
   * 获取组件实例
   */
  getComponent(id: string): CompInstance<any> | undefined {
    return this._components.get(id);
  }
  
  /**
   * 根据名称获取组件
   */
  getComponentByName(name: string): CompInstance<any> | undefined {
    for (const instance of this._components.values()) {
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
    this._components.delete(id);
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
   */
  updateComponent(id: string, updates: Partial<ComponentData>) {
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
    this._components.clear();
    for (const page of data.pages) {
      for (const compData of page.components) {
        this.createComponentInstance(compData);
      }
    }
    
    // 加载查询
    if (data.queries) {
      this.queryManager.loadQueries(data.queries);
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
}

/**
 * 创建应用上下文
 */
export function createAppContext(initialSchema?: AppData): AppContext {
  return new AppContext(initialSchema);
}
