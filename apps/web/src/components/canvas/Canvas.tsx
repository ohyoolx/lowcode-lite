import { useState, useRef, useCallback, useEffect } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry } from '@lowcode-lite/core';
import { generateId, generateComponentName, type ComponentData } from '@lowcode-lite/shared';
import { createFormInitialChildren } from '@/utils/formUtils';
import { ComponentWrapper } from './ComponentWrapper';
import { 
  GRID_COLS, 
  GRID_ROW_HEIGHT, 
  GRID_MARGIN,
  GRID_LINE_ROW_INTERVAL,
  defaultGridConfig,
  pxToGrid,
  calcColWidth,
  calcCanvasHeight,
  calculateRequiredRows,
  cascadeLayout,
  type GridConfig 
} from './gridUtils';
import { Plus, Eye } from 'lucide-react';

interface CanvasProps {
  className?: string;
}

// 画布最小宽度（防止过小）
const MIN_CANVAS_WIDTH = 600;

// Modal 内容组件 - 支持拖拽子组件
interface ModalContentProps {
  comp: ComponentData;
  resolvedProps: Record<string, any>;
  isPreviewMode: boolean;
  gridConfig: GridConfig;
  isSelected: boolean;
}

function ModalContent({ comp, resolvedProps, isPreviewMode, gridConfig }: ModalContentProps) {
  const appContext = useCoreContext();
  const editor = useEditor();
  const contentRef = useRef<HTMLDivElement>(null);
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  
  // 检查 Modal 本身是否被选中
  const isModalSelected = editor.selectedComponentId.value === comp.id;
  
  const widthStyles: Record<string, string> = {
    sm: '384px',
    md: '448px',
    lg: '512px',
    xl: '576px',
    '2xl': '672px',
  };
  
  const {
    title,
    width,
    showHeader,
    showCloseButton,
    showFooter,
    showCancelButton,
    cancelButtonText,
    showConfirmButton,
    confirmButtonText,
  } = resolvedProps;
  
  // 处理关闭 Modal
  const handleClose = useCallback(() => {
    if (!isPreviewMode) {
      // 编辑模式：取消选中
      editor.selectedComponentId.value = null;
    } else {
      // 预览模式：触发关闭事件（如果有的话）
      // TODO: 触发 onClose 事件
    }
  }, [isPreviewMode, editor]);
  
  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setShowDropIndicator(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    setShowDropIndicator(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    e.stopPropagation();
    setShowDropIndicator(false);
    
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;
    
    // 获取组件定义
    const definition = componentRegistry.get(componentType);
    const defaultSize = definition?.defaultSize ?? { w: 4, h: 4 };
    
    // 生成组件名
    const allComponents = appContext.getAllComponents();
    const existingNames = allComponents.map((c) => c.name);
    const name = generateComponentName(componentType, existingNames);
    
    const newId = generateId('comp');
    
    // 如果是表单组件，创建初始子组件
    const formChildren = componentType === 'form' 
      ? createFormInitialChildren(existingNames)
      : undefined;
    
    // 计算在 Modal 内容区的相对位置
    const rect = contentRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      const colWidth = calcColWidth(gridConfig);
      const x = Math.max(0, Math.round(relativeX / (colWidth + GRID_MARGIN)));
      const y = Math.max(0, Math.round(relativeY / (GRID_ROW_HEIGHT + GRID_MARGIN)));
      
      // 添加到 Modal 容器内
      appContext.addComponent({
        id: newId,
        type: componentType,
        name,
        props: {},
        position: { x, y, w: defaultSize.w, h: defaultSize.h },
        children: formChildren,
      }, comp.id);
      
      editor.selectedComponentId.value = newId;
    }
  };
  
  // 渲染子组件
  const children = comp.children ?? [];
  
  // 在编辑模式下，如果 Modal 被选中，需要阻止所有点击事件向下传播
  // 这样点击 Modal 内部不会触发画布的取消选中
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    if (!isPreviewMode) {
      // 编辑模式下，阻止事件冒泡
      e.stopPropagation();
    }
  }, [isPreviewMode]);
  
  // 点击 Modal 的头部/底部等非内容区域，选中 Modal 本身
  const handleSelectModal = useCallback((e: React.MouseEvent) => {
    if (!isPreviewMode) {
      e.stopPropagation();
      editor.selectedComponentId.value = comp.id;
    }
  }, [isPreviewMode, editor.selectedComponentId, comp.id]);
  
  return (
    <div 
      className={cn(
        "relative bg-background rounded-lg shadow-2xl flex flex-col max-h-[80%] overflow-hidden",
        !isPreviewMode && isModalSelected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{ width: widthStyles[width] || widthStyles.md, minWidth: '320px' }}
      onClick={handleModalClick}
    >
      {/* 头部 - 点击可选中 Modal */}
      {showHeader && (
        <div 
          className={cn(
            "flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors",
            !isPreviewMode && isModalSelected && "bg-primary/5"
          )}
          onClick={handleSelectModal}
          title="点击选中弹窗组件"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {!isPreviewMode && isModalSelected && (
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">已选中</span>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors -mr-1.5"
            >
              <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      {/* 内容区域 - 支持拖拽 */}
      <div 
        ref={contentRef}
        className={cn(
          "flex-1 overflow-auto px-6 py-4 relative",
          showDropIndicator && "bg-primary/5"
        )}
        style={{ minHeight: '150px' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-component-id={comp.id}
        data-container="true"
        data-container-content="true"
      >
        {/* 子组件 */}
        {children.length > 0 ? (
          <div className="relative" style={{ minHeight: '100px' }}>
            {children.map((child: ComponentData) => (
              <ComponentWrapper
                key={child.id}
                data={child}
                gridConfig={gridConfig}
                isPreviewMode={isPreviewMode}
                parentId={comp.id}
                parentOffset={{ left: 0, top: 0 }}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground/50 text-sm">
            {isPreviewMode ? (
              <span>弹窗内容为空</span>
            ) : (
              <span>{showDropIndicator ? '释放以添加组件' : '拖拽组件到弹窗内'}</span>
            )}
          </div>
        )}
        
        {/* 拖拽指示器 */}
        {showDropIndicator && !isPreviewMode && (
          <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
        )}
      </div>
      
      {/* 底部按钮 - 点击空白区域可选中 Modal */}
      {showFooter && (
        <div 
          className="flex justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={handleSelectModal}
          title="点击空白区域选中弹窗组件"
        >
          {showCancelButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-md hover:bg-secondary/80 transition-colors"
            >
              {cancelButtonText}
            </button>
          )}
          {showConfirmButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Modal confirmed');
                // TODO: 触发 onConfirm 事件
              }}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              {confirmButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Canvas({ className }: CanvasProps) {
  useSignals(); // 启用 signals 自动追踪
  
  const appContext = useCoreContext();
  const editor = useEditor();
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(MIN_CANVAS_WIDTH);

  const currentPage = appContext.currentPage;
  const allComponents = currentPage?.components ?? [];
  const isPreviewMode = editor.isPreviewMode.value;
  
  // 自适应画布宽度：根据容器宽度动态调整
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateCanvasWidth = () => {
      const container = containerRef.current;
      if (!container) return;
      
      // 获取容器宽度，减去左右 padding (32px * 2 = 64px)
      const availableWidth = container.clientWidth - 64;
      
      // 确保不小于最小宽度
      const newWidth = Math.max(MIN_CANVAS_WIDTH, availableWidth);
      
      setCanvasWidth(newWidth);
    };
    
    // 初始计算
    updateCanvasWidth();
    
    // 监听窗口大小变化
    const resizeObserver = new ResizeObserver(updateCanvasWidth);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // 分离普通组件和覆盖层组件（如 Modal）
  const normalComponents = allComponents.filter(c => {
    const def = componentRegistry.get(c.type);
    return !def?.isOverlay;
  });
  const overlayComponents = allComponents.filter(c => {
    const def = componentRegistry.get(c.type);
    return def?.isOverlay;
  });

  // 计算需要的行数（基于所有组件的位置，自动拓展）
  const requiredRows = calculateRequiredRows(allComponents);
  
  // 计算网格配置（使用动态画布宽度和动态行数）
  const gridConfig: GridConfig = {
    ...defaultGridConfig,
    containerWidth: canvasWidth,
    rows: requiredRows,
  };

  const colWidth = calcColWidth(gridConfig);
  const canvasHeight = calcCanvasHeight(gridConfig);

  // 计算拖拽位置（对齐到网格）
  const calcDropPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const leftPx = clientX - rect.left;
    const topPx = clientY - rect.top;

    return pxToGrid(gridConfig, leftPx, topPx);
  }, [gridConfig]);

  const handleDragOver = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    
    // 检查是否在 Modal 等覆盖层内部，如果是则不处理（让 Modal 自己处理）
    const isInOverlay = (e.target as HTMLElement).closest('[data-overlay="true"]');
    if (isInOverlay) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    setShowDropIndicator(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    
    // 只有当离开画布区域时才隐藏指示器
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setShowDropIndicator(false);
      }
    }
  };

  // 检测拖拽位置是否在某个容器内（包括 overlay 组件如 Modal）
  const findContainerAtPosition = useCallback((clientX: number, clientY: number) => {
    // 合并所有组件，包括普通组件和 overlay 组件
    const allCanvasComponents = [...normalComponents, ...overlayComponents];
    const containers = allCanvasComponents.filter(c => {
      const def = componentRegistry.get(c.type);
      return def?.isContainer;
    });
    
    for (const container of containers) {
      const containerEl = document.querySelector(`[data-component-id="${container.id}"]`);
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return container;
        }
      }
    }
    return null;
  }, [normalComponents, overlayComponents]);

  const handleDrop = (e: React.DragEvent) => {
    if (isPreviewMode) return;
    
    // 检查是否在 Modal 等覆盖层内部，如果是则不处理（让 Modal 自己处理）
    const isInOverlay = (e.target as HTMLElement).closest('[data-overlay="true"]');
    if (isInOverlay) return;
    
    e.preventDefault();
    setShowDropIndicator(false);

    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;

    // 获取组件定义
    const definition = componentRegistry.get(componentType);
    const defaultSize = definition?.defaultSize ?? { w: 4, h: 4 };

    // 检测是否拖拽到容器内（排除 overlay 类型的容器）
    const targetContainer = findContainerAtPosition(e.clientX, e.clientY);
    // 确保目标容器不是 overlay 类型
    const targetDef = targetContainer ? componentRegistry.get(targetContainer.type) : null;
    const isTargetOverlay = targetDef?.isOverlay ?? false;

    // 生成组件名（包括所有嵌套组件）
    const allComponents = appContext.getAllComponents();
    const existingNames = allComponents.map((c) => c.name);
    const name = generateComponentName(componentType, existingNames);

    const newId = generateId('comp');

    // 如果是表单组件，创建初始子组件
    const children = componentType === 'form' 
      ? createFormInitialChildren(existingNames)
      : undefined;

    if (targetContainer && !isTargetOverlay) {
      // 计算相对于容器的位置
      const containerEl = document.querySelector(`[data-component-id="${targetContainer.id}"]`);
      if (containerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const relativeY = e.clientY - containerRect.top;
        
        // 转换为网格单位（相对于容器内部）
        const colWidth = calcColWidth(gridConfig);
        const x = Math.max(0, Math.round(relativeX / (colWidth + GRID_MARGIN)));
        const y = Math.max(0, Math.round(relativeY / (GRID_ROW_HEIGHT + GRID_MARGIN)));
        
        // 添加到容器内
        appContext.addComponent({
          id: newId,
          type: componentType,
          name,
          props: {},
          position: { x, y, w: defaultSize.w, h: defaultSize.h },
          children,
        }, targetContainer.id);
      }
    } else {
      // 添加到画布根级别
      const { x, y } = calcDropPosition(e.clientX, e.clientY);
      
      // 先添加组件
      appContext.addComponent({
        id: newId,
        type: componentType,
        name,
        props: {},
        position: { x, y, w: defaultSize.w, h: defaultSize.h },
        children,
      });
      
      // 应用碰撞检测，调整所有组件位置避免重叠
      const currentComponents = appContext.currentPage?.components ?? [];
      const adjustedComponents = cascadeLayout(currentComponents, 
        currentComponents.find(c => c.id === newId) // 新添加的组件优先级最高
      );
      
      // 批量更新组件位置
      adjustedComponents.forEach(comp => {
        const original = currentComponents.find(c => c.id === comp.id);
        if (original && (original.position.y !== comp.position.y)) {
          appContext.updateComponent(comp.id, {
            position: comp.position,
          });
        }
      });
    }

    // 选中新组件
    editor.selectedComponentId.value = newId;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-content')) {
      editor.selectedComponentId.value = null;
    }
  };

  // 生成网格线
  const renderGridLines = () => {
    if (isPreviewMode) return null;
    
    const lines = [];
    const { containerPadding, margin, rowHeight } = gridConfig;

    // 垂直线（列分割）
    for (let i = 0; i <= GRID_COLS; i++) {
      const left = containerPadding + i * (colWidth + margin) - margin / 2;
      lines.push(
        <div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 border-l border-dashed border-primary/10"
          style={{ left }}
        />
      );
    }

    // 水平线（每 GRID_LINE_ROW_INTERVAL 行一条线，让网格看起来更方形）
    for (let i = 0; i <= requiredRows; i += GRID_LINE_ROW_INTERVAL) {
      const top = containerPadding + i * (rowHeight + margin) - margin / 2;
      lines.push(
        <div
          key={`h-${i}`}
          className="absolute left-0 right-0 border-t border-dashed border-primary/10"
          style={{ top }}
        />
      );
    }

    return lines;
  };

  return (
    <main
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onClick={handleCanvasClick}
    >
      {/* 画布外层容器 - 确保内容可以滚动 */}
      <div 
        className="p-8 min-h-full flex justify-center items-start"
      >
        {/* 画布主体 - 宽度自适应铺满 */}
        <div
          ref={canvasRef}
          className={cn(
            "bg-background rounded-lg shadow-xl border relative overflow-hidden",
            isPreviewMode && "shadow-2xl ring-2 ring-green-500/20"
          )}
          style={{ 
            width: canvasWidth, 
            height: canvasHeight,
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 网格线 */}
          {!isPreviewMode && (
            <div className="absolute inset-0 pointer-events-none">
              {renderGridLines()}
            </div>
          )}

          {/* 拖拽位置指示器已移除，使用 ComponentPanel 中的自定义拖拽预览 */}

          {/* 画布内容区 */}
          <div className="canvas-content relative" style={{ height: canvasHeight }}>
            {normalComponents.length === 0 && !showDropIndicator ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                {isPreviewMode ? (
                  <>
                    <Eye className="h-16 w-16 opacity-20 mb-4" />
                    <p className="text-lg font-medium opacity-50">空白页面</p>
                    <p className="text-sm opacity-30 mt-2">退出预览模式后添加组件</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-4">
                      <Plus className="h-10 w-10 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">拖拽组件到这里开始搭建</p>
                    <p className="text-sm text-muted-foreground/60 mt-2">
                      从左侧面板选择组件，拖放到画布上
                    </p>
                    <p className="text-xs text-muted-foreground/40 mt-4">
                      画布网格：{GRID_COLS} 列 × {requiredRows} 行（自动拓展）| 列宽：{Math.round(colWidth)}px
                    </p>
                  </>
                )}
              </div>
            ) : (
              normalComponents.map((comp) => (
                <ComponentWrapper 
                  key={comp.id} 
                  data={comp} 
                  gridConfig={gridConfig}
                  isPreviewMode={isPreviewMode}
                />
              ))
            )}
          </div>
          
          {/* 覆盖层组件（Modal 等）- 在编辑模式下显示占位符 */}
          {!isPreviewMode && overlayComponents.length > 0 && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
              {overlayComponents.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => editor.selectedComponentId.value = comp.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border bg-background/95 shadow-lg backdrop-blur-sm transition-all",
                    editor.selectedComponentId.value === comp.id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  )}
                >
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  <span className="text-sm font-medium">{comp.name}</span>
                  <span className="text-xs text-muted-foreground">(弹窗)</span>
                </button>
              ))}
            </div>
          )}
          
          {/* 覆盖层组件渲染 - 只覆盖画布区域，参考 OpenBlocks 实现 */}
          {overlayComponents.map((comp) => {
            const definition = componentRegistry.get(comp.type);
            if (!definition) return null;
            
            // 解析 props
            const resolvedProps: Record<string, any> = {};
            for (const [key, propDef] of Object.entries(definition.props)) {
              resolvedProps[key] = comp.props[key] ?? propDef.default;
            }
            
            // 检查组件本身或其子组件是否被选中
            const isComponentOrChildSelected = (componentId: string): boolean => {
              const selectedId = editor.selectedComponentId.value;
              if (selectedId === componentId) return true;
              
              // 递归检查子组件
              const checkChildren = (compData: ComponentData): boolean => {
                if (compData.id === selectedId) return true;
                if (compData.children) {
                  return compData.children.some((child: ComponentData) => checkChildren(child));
                }
                return false;
              };
              
              return comp.children?.some((child: ComponentData) => checkChildren(child)) ?? false;
            };
            
            // 在预览模式下，根据 visible 属性决定是否显示
            // 在编辑模式下，如果选中了该组件或其任何子组件则显示
            const isSelected = isComponentOrChildSelected(comp.id);
            const shouldShow = isPreviewMode ? resolvedProps.visible : isSelected;
            
            if (!shouldShow) return null;
            
            return (
              <div 
                key={comp.id} 
                className="absolute inset-0 z-[100]"
                style={{ pointerEvents: 'auto' }} // 关键：屏蔽下层的鼠标事件
                data-component-id={comp.id}
                data-overlay="true"
                data-container="true"
              >
                {/* 遮罩层 - 只覆盖画布 */}
                <div 
                  className="absolute inset-0 bg-black/50"
                  onClick={(e) => {
                    // 只有直接点击遮罩层才处理
                    if (e.target !== e.currentTarget) return;
                    // 编辑模式下点击遮罩层不关闭（因为需要编辑内部组件）
                    // 只有在预览模式下才根据 maskClosable 判断是否关闭
                    if (isPreviewMode && resolvedProps.maskClosable !== false) {
                      // TODO: 触发关闭事件
                      console.log('Modal mask clicked in preview mode');
                    }
                  }}
                />
                
                {/* 弹窗内容容器 */}
                <div 
                  className="absolute inset-0 flex items-center justify-center overflow-auto p-4"
                  onClick={(e) => {
                    // 只有直接点击这个容器才处理
                    if (e.target !== e.currentTarget) return;
                    // 编辑模式下点击容器区域不关闭
                    if (isPreviewMode && resolvedProps.maskClosable !== false) {
                      // TODO: 触发关闭事件
                      console.log('Modal container clicked in preview mode');
                    }
                  }}
                >
                  {/* Modal 内容，参考 OpenBlocks 的 ModalWrapper */}
                  <ModalContent 
                    comp={comp}
                    resolvedProps={resolvedProps}
                    isPreviewMode={isPreviewMode}
                    gridConfig={gridConfig}
                    isSelected={isSelected}
                  />
                </div>
                
                {/* 编辑模式下的关闭提示 */}
                {!isPreviewMode && (
                  <div className="absolute top-4 right-4 z-[110]">
                    <button
                      type="button"
                      onClick={() => editor.selectedComponentId.value = null}
                      className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg shadow-lg hover:bg-muted transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span className="text-sm">关闭预览</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
