import { signal, computed, type Signal, type ReadonlySignal } from '../reactive/signals';
import { CompState } from '../reactive/compState';
import type { ComponentData, CompDefinition, PropDefs, ResolvedProps } from '@lowcode-lite/shared';
import type { AppContext } from '../reactive/appContext';

/**
 * 组件实例
 * 管理单个组件的状态和生命周期
 */
export class CompInstance<P extends PropDefs> {
  readonly id: string;
  readonly type: string;
  private _name: Signal<string>;
  readonly definition: CompDefinition<P>;
  
  // 属性状态映射
  readonly props: { [K in keyof P]: CompState<P[K]['default']> };
  
  // 组件暴露的值
  readonly exposedValues: ReadonlySignal<Record<string, any>>;
  
  // 组件位置
  private _position: ComponentData['position'];
  
  constructor(
    definition: CompDefinition<P>,
    data: ComponentData,
    private appContext: AppContext
  ) {
    this.id = data.id;
    this.type = data.type;
    this._name = signal(data.name);
    this.definition = definition;
    this._position = data.position;
    
    // 初始化所有属性状态
    this.props = {} as any;
    
    for (const [key, propDef] of Object.entries(definition.props)) {
      // 传入 exposedValues Signal，这样当 exposedValues 变化时，
      // CompState.value 会自动重新计算（因为在 computed 中访问了 Signal.value）
      const state = new CompState(
        propDef.default,
        this.appContext.exposedValues
      );
      
      // 从初始数据加载
      const initialValue = data.props?.[key];
      if (initialValue !== undefined) {
        state.fromJSON(initialValue);
      }
      
      (this.props as any)[key] = state;
    }
    
    // 计算暴露的值
    this.exposedValues = computed(() => {
      // 先获取所有解析后的属性值
      const resolvedProps: Record<string, any> = {};
      for (const [key, state] of Object.entries(this.props)) {
        resolvedProps[key] = (state as CompState<any>).value.value;
      }
      
      // 如果定义了 exposeComputed，使用它来计算暴露值
      if (definition.exposeComputed) {
        const computedValues = definition.exposeComputed(resolvedProps as ResolvedProps<P>);
        // 合并：exposeComputed 的值优先
        return { ...resolvedProps, ...computedValues };
      }
      
      // 否则暴露所有属性值
      return resolvedProps;
    });
  }
  
  /**
   * 获取组件名称
   */
  get name(): string {
    return this._name.value;
  }
  
  /**
   * 获取组件名称 Signal（用于响应式追踪）
   */
  get nameSignal(): Signal<string> {
    return this._name;
  }
  
  /**
   * 更新组件名称
   */
  updateName(newName: string) {
    this._name.value = newName;
  }
  
  /**
   * 获取解析后的属性值（用于渲染）
   */
  getResolvedProps(): ResolvedProps<P> {
    const result: any = {};
    
    for (const [key, state] of Object.entries(this.props)) {
      result[key] = (state as CompState<any>).value.value;
    }
    
    return result;
  }
  
  /**
   * 设置属性值
   */
  setProp<K extends keyof P>(key: K, value: P[K]['default']) {
    const state = this.props[key];
    if (state) {
      state.set(value);
      this.syncToSchema();
    }
  }
  
  /**
   * 从外部设置属性值（不同步到 schema，因为调用者会处理）
   * 用于 appContext.updateComponent 调用时同步组件实例状态
   */
  setPropFromExternal(key: string, value: unknown) {
    const state = (this.props as Record<string, CompState<unknown>>)[key];
    if (state) {
      // 使用 fromJSON 来处理值，它会自动判断是表达式还是普通值
      state.fromJSON(value);
    }
  }
  
  /**
   * 绑定属性表达式
   */
  bindProp<K extends keyof P>(key: K, expression: string) {
    const state = this.props[key];
    if (state) {
      state.bind(expression);
      this.syncToSchema();
    }
  }
  
  /**
   * 获取位置
   */
  get position(): ComponentData['position'] {
    return this._position;
  }
  
  /**
   * 更新位置
   */
  updatePosition(position: Partial<ComponentData['position']>) {
    this._position = { ...this._position, ...position };
    this.syncToSchema();
  }
  
  /**
   * 同步到 Schema
   */
  private syncToSchema() {
    const props: Record<string, any> = {};
    
    for (const [key, state] of Object.entries(this.props)) {
      props[key] = (state as CompState<any>).toJSON();
    }
    
    this.appContext.updateComponent(this.id, {
      props,
      position: this._position,
    });
  }
  
  /**
   * 序列化为 JSON
   */
  toJSON(): ComponentData {
    const props: Record<string, any> = {};
    
    for (const [key, state] of Object.entries(this.props)) {
      props[key] = (state as CompState<any>).toJSON();
    }
    
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      props,
      position: this._position,
    };
  }
}
