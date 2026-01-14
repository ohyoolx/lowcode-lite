import { useEffect } from 'react';
import { useCoreContext, useEditor } from '@/context/AppContext';

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

      // Ctrl/Cmd + D - 复制组件
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedId) {
        e.preventDefault();
        const selectedComponent = appContext.currentPage?.components.find(
          (c) => c.id === selectedId
        );
        if (selectedComponent) {
          const newId = `comp_${Date.now()}`;
          const existingNames = appContext.currentPage?.components.map((c) => c.name) ?? [];
          let newName = `${selectedComponent.name}_copy`;
          let counter = 1;
          while (existingNames.includes(newName)) {
            newName = `${selectedComponent.name}_copy${counter++}`;
          }

          appContext.addComponent({
            ...selectedComponent,
            id: newId,
            name: newName,
            position: {
              ...selectedComponent.position,
              x: selectedComponent.position.x + 2,
              y: selectedComponent.position.y + 2,
            },
          });

          editor.selectedComponentId.value = newId;
        }
      }

      // Arrow keys - 移动组件
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const selectedComponent = appContext.currentPage?.components.find(
          (c) => c.id === selectedId
        );
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
