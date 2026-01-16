import { useEffect } from 'react';
import { useCoreContext, useEditor } from '@/context/AppContext';
import type { ComponentData } from '@lowcode-lite/shared';

/**
 * 深度克隆组件数据，并为所有组件（包括嵌套子组件）生成新的 ID
 */
function deepCloneComponentWithNewIds(component: ComponentData, existingNames: string[]): ComponentData {
  const newId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 生成唯一的名称
  let newName = `${component.name}_copy`;
  let counter = 1;
  while (existingNames.includes(newName)) {
    newName = `${component.name}_copy${counter++}`;
  }
  existingNames.push(newName); // 添加到已存在名称列表，避免嵌套组件名称冲突
  
  const cloned: ComponentData = {
    ...component,
    id: newId,
    name: newName,
    props: JSON.parse(JSON.stringify(component.props)), // 深克隆 props
    position: { ...component.position },
  };
  
  // 递归处理子组件
  if (component.children && component.children.length > 0) {
    cloned.children = component.children.map(child => 
      deepCloneComponentWithNewIds(child, existingNames)
    );
  }
  
  return cloned;
}

export function useKeyboardShortcuts() {
  const appContext = useCoreContext();
  const editor = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedId = editor.selectedComponentId.value;

      // 忽略输入框中的键盘事件
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Delete / Backspace - 删除选中的组件
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        appContext.deleteComponent(selectedId);
        editor.selectedComponentId.value = null;
      }

      // Escape - 取消选择
      if (e.key === 'Escape') {
        editor.selectedComponentId.value = null;
      }

      // Ctrl/Cmd + C - 复制组件到剪贴板
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        e.preventDefault();
        // 使用 findComponent 来查找组件（支持嵌套）
        const selectedComponent = appContext.findComponent(selectedId);
        if (selectedComponent) {
          // 深拷贝组件数据到剪贴板
          editor.clipboard.value = JSON.parse(JSON.stringify(selectedComponent));
        }
      }

      // Ctrl/Cmd + V - 粘贴组件
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && editor.clipboard.value) {
        e.preventDefault();
        const clipboardData = editor.clipboard.value;
        
        // 获取所有现有组件名称（扁平化）
        const existingNames = appContext.getAllComponents().map((c) => c.name);
        
        // 克隆组件并生成新的 ID
        const newComponent = deepCloneComponentWithNewIds(clipboardData, [...existingNames]);
        
        // 偏移位置，避免完全重叠
        newComponent.position = {
          ...newComponent.position,
          x: newComponent.position.x + 1,
          y: newComponent.position.y + 1,
        };
        
        // 添加到画布（添加到根级别）
        appContext.addComponent(newComponent);
        
        // 选中新组件
        editor.selectedComponentId.value = newComponent.id;
      }

      // Ctrl/Cmd + D - 快速复制组件（复制并粘贴一步完成）
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        const selectedComponent = appContext.findComponent(selectedId);
        if (selectedComponent) {
          // 获取所有现有组件名称（扁平化）
          const existingNames = appContext.getAllComponents().map((c) => c.name);
          
          // 克隆组件并生成新的 ID
          const newComponent = deepCloneComponentWithNewIds(selectedComponent, [...existingNames]);
          
          // 偏移位置
          newComponent.position = {
            ...newComponent.position,
            x: newComponent.position.x + 2,
            y: newComponent.position.y + 2,
          };

          appContext.addComponent(newComponent);
          editor.selectedComponentId.value = newComponent.id;
        }
      }

      // Arrow keys - 移动组件
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const selectedComponent = appContext.findComponent(selectedId);
        if (selectedComponent) {
          const step = e.shiftKey ? 5 : 1;
          const newPosition = { ...selectedComponent.position };

          switch (e.key) {
            case 'ArrowUp':
              newPosition.y = Math.max(0, newPosition.y - step);
              break;
            case 'ArrowDown':
              newPosition.y += step;
              break;
            case 'ArrowLeft':
              newPosition.x = Math.max(0, newPosition.x - step);
              break;
            case 'ArrowRight':
              newPosition.x += step;
              break;
          }

          appContext.updateComponent(selectedId, { position: newPosition });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appContext, editor]);
}
