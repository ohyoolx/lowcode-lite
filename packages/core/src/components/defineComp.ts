import type {
  CompDefinition,
  PropDefs,
  ComponentManifest,
} from '@lowcode-lite/shared';

/**
 * 定义组件
 * 这是创建 LowCode 组件的主要 API
 */
export function defineComp<P extends PropDefs>(
  definition: CompDefinition<P>
): CompDefinition<P> {
  // 验证必要字段
  if (!definition.name) {
    throw new Error('Component name is required');
  }
  
  if (!definition.displayName) {
    throw new Error('Component displayName is required');
  }
  
  if (!definition.props) {
    throw new Error('Component props is required');
  }
  
  if (!definition.view) {
    throw new Error('Component view is required');
  }
  
  // 返回定义（可以在这里添加默认值或处理）
  return {
    ...definition,
    defaultSize: definition.defaultSize ?? { w: 4, h: 4 },
  };
}

/**
 * 从组件定义中提取清单信息
 */
export function extractManifest<P extends PropDefs>(
  definition: CompDefinition<P>
): ComponentManifest {
  return {
    name: definition.name,
    displayName: definition.displayName,
    category: definition.category,
    icon: definition.icon,
    description: definition.description,
    defaultSize: definition.defaultSize ?? { w: 4, h: 4 },
    isContainer: definition.isContainer,
    isOverlay: definition.isOverlay,
  };
}
