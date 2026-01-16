import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry, evaluateTemplate } from '@lowcode-lite/core';
import type { ComponentData } from '@lowcode-lite/shared';
import {
  type GridConfig,
  calcComponentStyle,
  pxToGrid,
  pxToGridSize,
  clampGridSize,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  calcColWidth,
  cascadeLayout,
} from './gridUtils';

interface ComponentWrapperProps {
  data: ComponentData;
  gridConfig: GridConfig;
  isPreviewMode?: boolean;
  /** 父容器 ID（如果是嵌套在容器内的组件） */
  parentId?: string;
  /** 父容器的像素偏移（用于计算相对位置） */
  parentOffset?: { left: number; top: number };
}

// 内容区域边界定义
interface ContentInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// 获取容器的内容区域边界
function getContainerContentInsets(containerEl: Element | null): ContentInsets | null {
  if (!containerEl) return null;
  
  const insetsAttr = containerEl.getAttribute('data-content-insets');
  if (!insetsAttr) return null;
  
  try {
    return JSON.parse(insetsAttr) as ContentInsets;
  } catch {
    return null;
  }
}

// 获取容器的内容区域矩形（考虑 contentInsets）
function getContainerContentRect(containerEl: Element): DOMRect {
  const containerRect = containerEl.getBoundingClientRect();
  const insets = getContainerContentInsets(containerEl);
  
  if (!insets) {
    return containerRect;
  }
  
  // 创建一个新的 DOMRect，考虑内容区域的边距
  return new DOMRect(
    containerRect.left + insets.left,
    containerRect.top + insets.top,
    containerRect.width - insets.left - insets.right,
    containerRect.height - insets.top - insets.bottom
  );
}

// 显示/隐藏容器的放置区域指示器
function showDropZoneIndicator(containerId: string, show: boolean) {
  const containerEl = document.querySelector(`[data-component-id="${containerId}"]`);
  if (!containerEl) return;
  
  const indicator = containerEl.querySelector('.form-drop-zone-indicator');
  if (indicator) {
    if (show) {
      indicator.classList.add('opacity-100');
      indicator.classList.remove('opacity-0');
    } else {
      indicator.classList.remove('opacity-100');
      indicator.classList.add('opacity-0');
    }
  }
}

export function ComponentWrapper({ 
  data, 
  gridConfig, 
  isPreviewMode = false,
  parentId,
  parentOffset,
}: ComponentWrapperProps) {
  useSignals(); // 启用 signals 自动追踪
  
  const appContext = useCoreContext();
  const editor = useEditor();
  const isSelected = !isPreviewMode && editor.selectedComponentId.value === data.id;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  

  // 获取组件定义
  const definition = componentRegistry.get(data.type);
  const isContainer = definition?.isContainer ?? false;
  const colWidth = calcColWidth(gridConfig);

  // 计算实际像素位置和尺寸
  // 如果有父容器偏移，说明是嵌套组件，使用相对位置
  const style = parentOffset 
    ? {
        position: 'absolute' as const,
        left: data.position.x * (colWidth + GRID_MARGIN),
        top: data.position.y * (GRID_ROW_HEIGHT + GRID_MARGIN),
        width: data.position.w * colWidth + (data.position.w - 1) * GRID_MARGIN,
        height: data.position.h * GRID_ROW_HEIGHT + (data.position.h - 1) * GRID_MARGIN,
      }
    : calcComponentStyle(
        gridConfig,
        data.position.x,
        data.position.y,
        data.position.w,
        data.position.h
      );

  // 处理点击选中
  const handleClick = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    
    // 阻止事件冒泡，防止触发父组件或遮罩层的点击事件
    e.stopPropagation();
    editor.selectedComponentId.value = data.id;
  };

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    
    // 忽略来自 resize 手柄的事件
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    if (e.button !== 0) return;
    
    // 检查是否点击的是交互式表单元素
    const target = e.target as HTMLElement;
    const interactiveTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'];
    const isInteractiveElement = interactiveTags.includes(target.tagName) ||
      target.isContentEditable ||
      target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"], [role="textbox"], [role="combobox"], [role="listbox"]');
    
    // 如果组件已选中且点击的是交互式元素，不启动拖拽，让元素正常交互
    if (isSelected && isInteractiveElement) {
      e.stopPropagation(); // 仍然阻止冒泡，但不阻止默认行为
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    editor.selectedComponentId.value = data.id;
    setIsDragging(true);
    
    // 拖拽开始时记录历史（只记录一次）
    appContext.recordHistory(`移动组件 ${data.name}`);
    
    // 记录初始拖拽偏移
    const rect = wrapperRef.current?.getBoundingClientRect();
    const initialOffset = rect ? {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    } : { x: 0, y: 0 };
    setDragOffset(initialOffset);
    
    // 如果在容器内，显示放置区域指示器
    if (parentId) {
      showDropZoneIndicator(parentId, true);
    }
    
    // 直接添加 mouseup 监听器（不依赖 useEffect）
    const handleImmediateMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mouseup', handleImmediateMouseUp);
      
      // 隐藏所有放置区域指示器
      document.querySelectorAll('.form-drop-zone-indicator').forEach(el => {
        el.classList.remove('opacity-100');
        el.classList.add('opacity-0');
      });
      
      // 检测是否放在了某个容器上
      const targetContainerId = findContainerAtPosition(upEvent.clientX, upEvent.clientY);
      
      // 清除所有容器的高亮状态
      document.querySelectorAll('[data-container="true"]').forEach(el => {
        el.classList.remove('container-drop-target');
      });
      
      // 如果目标容器与当前父容器不同，需要移动组件
      const normalizedTargetId = targetContainerId ?? undefined;
      const normalizedParentId = parentId ?? undefined;
      
      if (normalizedTargetId !== normalizedParentId) {
        // 跨容器移动逻辑（不需要碰撞检测）
        let newX = data.position.x;
        let newY = data.position.y;
        
        if (targetContainerId) {
          let containerEl = document.querySelector(`[data-component-id="${targetContainerId}"][data-container-content="true"]`);
          if (!containerEl) {
            containerEl = document.querySelector(`[data-component-id="${targetContainerId}"][data-container="true"]:not([data-overlay="true"])`);
          }
          if (containerEl) {
            // 使用内容区域的矩形来计算位置
            const contentRect = getContainerContentRect(containerEl);
            const leftPx = upEvent.clientX - initialOffset.x - contentRect.left;
            const topPx = upEvent.clientY - initialOffset.y - contentRect.top;
            const pos = pxToGrid(gridConfig, leftPx, topPx);
            
            // 计算内容区域的网格尺寸限制
            const contentWidth = contentRect.width;
            const contentHeight = contentRect.height;
            const maxGridX = Math.floor(contentWidth / (colWidth + GRID_MARGIN)) - data.position.w;
            const maxGridY = Math.floor(contentHeight / (GRID_ROW_HEIGHT + GRID_MARGIN)) - data.position.h;
            
            newX = Math.max(0, Math.min(pos.x, maxGridX));
            newY = Math.max(0, Math.min(pos.y, maxGridY));
          }
        } else {
          const canvas = document.querySelector('.canvas-content');
          if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            const leftPx = upEvent.clientX - initialOffset.x - canvasRect.left;
            const topPx = upEvent.clientY - initialOffset.y - canvasRect.top;
            const pos = pxToGrid(gridConfig, leftPx, topPx);
            newX = pos.x;
            newY = pos.y;
          }
        }
        
        // 跨容器移动不记录历史（开始时已记录）
        appContext.moveComponent(data.id, targetContainerId ?? undefined, { x: newX, y: newY });
      } else {
        // 在同一容器内移动，应用碰撞检测
        const currentPage = appContext.currentPage;
        if (!currentPage) {
          setIsDragging(false);
          return;
        }
        
        // 获取兄弟组件
        let siblings: ComponentData[];
        if (parentId) {
          const allComponents = appContext.getAllComponents();
          const parentComp = allComponents.find(c => c.id === parentId);
          siblings = parentComp?.children ?? [];
        } else {
          siblings = currentPage.components;
        }
        
        // 找到当前组件的最新数据
        const updatedComponent = siblings.find(c => c.id === data.id);
        if (updatedComponent) {
          // 应用碰撞检测
          const adjustedComponents = cascadeLayout(siblings, updatedComponent);
          
          // 批量更新组件位置（不记录历史）
          adjustedComponents.forEach(comp => {
            if (comp.id === data.id) return;
            
            const original = siblings.find(c => c.id === comp.id);
            if (original && original.position.y !== comp.position.y) {
              appContext.updateComponent(comp.id, {
                position: comp.position,
              }, false);
            }
          });
        }
      }
      
      setIsDragging(false);
    };
    
    document.addEventListener('mouseup', handleImmediateMouseUp);
  };

  // 处理调整大小开始
  const handleResizeStart = (e: React.MouseEvent, direction: 'left' | 'right' | 'top' | 'bottom') => {
    if (isPreviewMode) return;
    
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    
    // 调整大小开始时记录历史（只记录一次）
    appContext.recordHistory(`调整组件尺寸 ${data.name}`);
    
    // 记录初始鼠标位置
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    
    // 记录初始组件位置和尺寸（网格单位）
    const startPosition = { ...data.position };
    
    // 记录初始组件的像素尺寸
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const startWidthPx = wrapperRect?.width ?? 0;
    const startHeightPx = wrapperRect?.height ?? 0;
    
    const handleResizeMove = (moveEvent: MouseEvent) => {
      // 计算鼠标移动的像素距离
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      
      let newW = startPosition.w;
      let newH = startPosition.h;
      let newX = startPosition.x;
      let newY = startPosition.y;
      
      // 根据拖拽方向计算新的像素尺寸，然后转换为网格单位
      if (direction === 'right') {
        // 右边拖动：增加宽度
        const newWidthPx = startWidthPx + deltaX;
        const { w } = pxToGridSize(gridConfig, newWidthPx, 0);
        newW = Math.max(1, w);
      } else if (direction === 'left') {
        // 左边拖动：减少宽度，同时调整 x 位置
        const newWidthPx = startWidthPx - deltaX;
        const { w } = pxToGridSize(gridConfig, newWidthPx, 0);
        newW = Math.max(1, w);
        // 宽度变化量决定 x 位置的变化
        const widthChange = startPosition.w - newW;
        newX = startPosition.x + widthChange;
      } else if (direction === 'bottom') {
        // 底边拖动：增加高度
        const newHeightPx = startHeightPx + deltaY;
        const { h } = pxToGridSize(gridConfig, 0, newHeightPx);
        newH = Math.max(1, h);
      } else if (direction === 'top') {
        // 顶边拖动：减少高度，同时调整 y 位置
        const newHeightPx = startHeightPx - deltaY;
        const { h } = pxToGridSize(gridConfig, 0, newHeightPx);
        newH = Math.max(1, h);
        // 高度变化量决定 y 位置的变化
        const heightChange = startPosition.h - newH;
        newY = startPosition.y + heightChange;
      }
      
      // 限制尺寸在有效范围内
      const clamped = clampGridSize(gridConfig, newX, newY, newW, newH);
      
      // 确保位置不为负数
      const finalX = direction === 'left' ? Math.max(0, newX) : startPosition.x;
      const finalY = direction === 'top' ? Math.max(0, newY) : startPosition.y;
      
      // 调整大小过程中不记录历史（开始时已记录）
      appContext.updateComponent(data.id, {
        position: {
          x: finalX,
          y: finalY,
          w: clamped.w,
          h: clamped.h,
        },
      }, false);
    };
    
    const handleResizeEnd = () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // 查找鼠标位置下的容器组件
  const findContainerAtPosition = useCallback((clientX: number, clientY: number): string | null => {
    // 获取所有容器组件的 DOM 元素
    const containerElements = document.querySelectorAll('[data-container="true"]');
    
    // 从后往前遍历（z-index 高的在后面），优先检测上层容器
    const elementsArray = Array.from(containerElements).reverse();
    
    for (const el of elementsArray) {
      const containerId = el.getAttribute('data-component-id');
      // 只跳过自身（如果自己是容器）
      if (containerId === data.id) continue;
      
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return containerId;
      }
    }
    return null;
  }, [data.id]);

  // 处理鼠标移动（拖动过程中的位置更新）
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 检测是否悬停在某个容器上
      const targetContainerId = findContainerAtPosition(e.clientX, e.clientY);
      
      // 通知所有容器更新高亮状态和放置区域指示器
      document.querySelectorAll('[data-container="true"]').forEach(el => {
        const id = el.getAttribute('data-component-id');
        if (id === targetContainerId) {
          el.classList.add('container-drop-target');
          // 显示放置区域指示器
          showDropZoneIndicator(id!, true);
        } else {
          el.classList.remove('container-drop-target');
          // 隐藏放置区域指示器（除了当前父容器）
          if (id !== parentId) {
            showDropZoneIndicator(id!, false);
          }
        }
      });
      
      // 计算新位置
      let referenceRect: DOMRect;
      let maxGridX = gridConfig.cols - data.position.w;
      let maxGridY = Infinity; // 画布高度无限制
      
      if (parentId) {
        // 如果在容器内，相对于容器的内容区域计算
        let parentEl = document.querySelector(`[data-component-id="${parentId}"][data-container-content="true"]`);
        if (!parentEl) {
          parentEl = document.querySelector(`[data-component-id="${parentId}"][data-container="true"]:not([data-overlay="true"])`);
        }
        if (!parentEl) return;
        
        // 获取内容区域的矩形
        referenceRect = getContainerContentRect(parentEl);
        
        // 计算内容区域的网格尺寸限制
        const contentWidth = referenceRect.width;
        const contentHeight = referenceRect.height;
        maxGridX = Math.floor(contentWidth / (colWidth + GRID_MARGIN)) - data.position.w;
        maxGridY = Math.floor(contentHeight / (GRID_ROW_HEIGHT + GRID_MARGIN)) - data.position.h;
      } else {
        // 否则相对于画布计算
        const canvas = document.querySelector('.canvas-content');
        if (!canvas) return;
        referenceRect = canvas.getBoundingClientRect();
      }

      const leftPx = e.clientX - dragOffset.x - referenceRect.left;
      const topPx = e.clientY - dragOffset.y - referenceRect.top;

      // 转换为网格单位
      const { x, y } = pxToGrid(gridConfig, leftPx, topPx);

      // 限制在有效范围内（考虑容器内容区域的边界）
      const clampedX = Math.max(0, Math.min(x, maxGridX));
      const clampedY = Math.max(0, Math.min(y, maxGridY));

      // 拖拽过程中不记录历史（开始时已记录）
      appContext.updateComponent(data.id, {
        position: {
          ...data.position,
          x: clampedX,
          y: clampedY,
        },
      }, false);
    };

    // 只处理 mousemove，mouseup 在 handleMouseDown 中处理
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  // 注意：不要将 data.position 加入依赖项，否则每次拖动都会重新绑定事件监听器
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset, data.id, appContext, gridConfig, parentId, findContainerAtPosition, colWidth]);

  if (!definition) {
    return (
      <div
        ref={wrapperRef}
        onClick={handleClick}
        className={cn(
          'absolute border rounded p-2 bg-red-50',
          !isPreviewMode && (isSelected ? 'border-red-500 ring-2 ring-red-200' : 'border-red-300')
        )}
        style={style}
      >
        <div className="text-xs text-red-500">未知组件: {data.type}</div>
      </div>
    );
  }

  // 解析 props（支持表达式求值）
  // 直接访问 exposedValues.value 来建立响应式依赖
  // 当 exposedValues 变化时（如组件名称修改），会自动触发重新渲染
  const expressionContext = appContext.exposedValues.value;
  
  const resolvedProps: Record<string, any> = useMemo(() => {
    const result: Record<string, any> = {};
    
    for (const [key, propDef] of Object.entries(definition.props)) {
      const rawValue = data.props[key] ?? propDef.default;
      
      // 如果是字符串类型且包含表达式 {{}}，进行求值
      if (typeof rawValue === 'string' && rawValue.includes('{{') && rawValue.includes('}}')) {
        try {
          result[key] = evaluateTemplate(rawValue, expressionContext);
        } catch (error) {
          console.warn(`Expression evaluation failed for ${key}:`, error);
          result[key] = rawValue; // 求值失败时保持原值
        }
      } else {
        result[key] = rawValue;
      }
    }
    
    return result;
  }, [definition.props, data.props, expressionContext]);

  // 创建组件事件处理器
  const handlers = {
    onChange: (propName: string, value: any) => {
      appContext.updateComponent(data.id, {
        props: {
          ...data.props,
          [propName]: value,
        },
      });
    },
    triggerEvent: (eventName: string, payload?: any) => {
      // TODO: 实现事件触发逻辑
      console.log(`Event triggered: ${eventName}`, payload);
    },
  };

  // 渲染子组件（如果是容器）
  const renderChildren = () => {
    if (!isContainer || !data.children || data.children.length === 0) {
      return null;
    }
    
    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
    const childOffset = wrapperRect 
      ? { left: wrapperRect.left, top: wrapperRect.top }
      : { left: 0, top: 0 };
    
    return (
      <div className="relative w-full h-full pointer-events-auto">
        {data.children.map((child: ComponentData) => (
          <ComponentWrapper
            key={child.id}
            data={child}
            gridConfig={gridConfig}
            isPreviewMode={isPreviewMode}
            parentId={data.id}
            parentOffset={childOffset}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      ref={wrapperRef}
      data-component-id={data.id}
      data-container={isContainer ? 'true' : undefined}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={cn(
        'absolute rounded overflow-hidden transition-shadow group',
        !isPreviewMode && isSelected
          ? 'ring-2 ring-primary shadow-lg z-10'
          : !isPreviewMode && 'hover:ring-1 hover:ring-primary/50',
        isDragging && 'cursor-grabbing opacity-90 z-50',
        !isPreviewMode && !isDragging && !isResizing && 'cursor-grab',
        isContainer && !isDragging && 'z-0' // 容器组件层级较低（除非正在拖拽）
      )}
      style={style}
    >
      {/* 组件名称标签 */}
      {isSelected && !isPreviewMode && (
        <div className="absolute -top-6 left-0 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-t font-medium z-10 whitespace-nowrap">
          {data.name}
          <span className="ml-2 opacity-60">
            ({data.position.x}, {data.position.y}) {data.position.w}×{data.position.h}
          </span>
        </div>
      )}

      {/* 渲染实际组件 */}
      {/* 
        交互逻辑：
        - 预览模式：完全可交互
        - 编辑模式 + 选中：组件内容可交互（用于输入、选择等）
        - 编辑模式 + 未选中：禁用交互（方便拖拽选择）
      */}
      <div className={cn(
        "w-full h-full bg-background",
        isPreviewMode 
          ? "pointer-events-auto" 
          : isSelected 
            ? "pointer-events-auto" // 选中时允许交互
            : (isContainer ? "pointer-events-none" : "pointer-events-none select-none")
      )}>
        {definition.view(
          resolvedProps, 
          null,
          // 如果是容器组件，渲染子组件
          renderChildren(),
          // 传递事件处理器
          handlers
        )}
      </div>

      {/* 选中时的边框 */}
      {isSelected && !isPreviewMode && (
        <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />
      )}

      {/* 调整大小手柄 */}
      {isSelected && !isPreviewMode && (
        <>
          {/* 左边调整手柄 */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'left')}
            className="resize-handle absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary/80 rounded-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
          />
          {/* 右边调整手柄 */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'right')}
            className="resize-handle absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary/80 rounded-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
          />
          {/* 顶边调整手柄 */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'top')}
            className="resize-handle absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-primary/80 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
          />
          {/* 底边调整手柄 */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
            className="resize-handle absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-primary/80 rounded-full cursor-ns-resize opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
          />
        </>
      )}
    </div>
  );
}
