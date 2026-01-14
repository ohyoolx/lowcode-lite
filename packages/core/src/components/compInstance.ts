import { computed, type ReadonlySignal } from '../reactive/signals';
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
  readonly name: string;
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
    this.name = data.name;
    this.definition = definition;
    this._position = data.position;
    
    // 初始化所有属性状态
    this.props = {} as any;
    
    for (const [key, propDef] of Object.entries(definition.props)) {
      const state = new CompState(
        propDef.default,
        () => this.appContext.getAllExposedValues()
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
      const result: Record<string, any> = {};
      
      // 暴露所有属性值
      for (const [key, state] of Object.entries(this.props)) {
        result[key] = (state as CompState<any>).value.value;
      }
      
      return result;
    });
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
