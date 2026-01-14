import type { CompDefinition, PropDefs, ComponentManifest } from '@lowcode-lite/shared';
import { extractManifest } from './defineComp';

/**
 * 组件注册表
 * 管理所有已注册的组件
 */
class ComponentRegistry {
  private components = new Map<string, CompDefinition<any>>();
  
  /**
   * 注册组件
   */
  register<P extends PropDefs>(definition: CompDefinition<P>): void {
    if (this.components.has(definition.name)) {
      console.warn(`Component "${definition.name}" is already registered. Overwriting.`);
    }
    this.components.set(definition.name, definition);
  }
  
  /**
   * 批量注册组件
   */
  registerAll(definitions: CompDefinition<any>[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }
  
  /**
   * 获取组件定义
   */
  get<P extends PropDefs>(name: string): CompDefinition<P> | undefined {
    return this.components.get(name) as CompDefinition<P> | undefined;
  }
  
  /**
   * 检查组件是否已注册
   */
  has(name: string): boolean {
    return this.components.has(name);
  }
  
  /**
   * 获取所有组件定义
   */
  getAll(): CompDefinition<any>[] {
    return Array.from(this.components.values());
  }
  
  /**
   * 获取所有组件清单（用于组件面板）
   */
  getAllManifests(): ComponentManifest[] {
    return this.getAll().map(extractManifest);
  }
  
  /**
   * 按分类获取组件清单
   */
  getManifestsByCategory(): Record<string, ComponentManifest[]> {
    const result: Record<string, ComponentManifest[]> = {};
    
    for (const manifest of this.getAllManifests()) {
      if (!result[manifest.category]) {
        result[manifest.category] = [];
      }
      result[manifest.category].push(manifest);
    }
    
    return result;
  }
  
  /**
   * 注销组件
   */
  unregister(name: string): boolean {
    return this.components.delete(name);
  }
  
  /**
   * 清空注册表
   */
  clear(): void {
    this.components.clear();
  }
}

// 全局注册表实例
export const componentRegistry = new ComponentRegistry();

/**
 * 注册组件的便捷函数
 */
export function registerComponent<P extends PropDefs>(
  definition: CompDefinition<P>
): void {
  componentRegistry.register(definition);
}

/**
 * 批量注册组件
 */
export function registerComponents(
  definitions: CompDefinition<any>[]
): void {
  componentRegistry.registerAll(definitions);
}
