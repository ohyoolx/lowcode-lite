import { useState, useRef, useEffect } from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Search,
  Square,
  Type,
  Image,
  Layout,
  MousePointer,
  List,
  CheckSquare,
  ToggleLeft,
  AlignLeft,
  CircleDot,
  Table,
  Loader,
  Tag,
  Minus,
  FileText,
  Maximize2,
} from 'lucide-react';

import { useCoreContext, useEditor } from '@/context/AppContext';
import { componentRegistry } from '@lowcode-lite/core';
import { generateId, generateComponentName } from '@lowcode-lite/shared';
import { GRID_ROW_HEIGHT, GRID_MARGIN, calcColWidth, type GridConfig, defaultGridConfig } from '../canvas/gridUtils';
import { createFormInitialChildren } from '@/utils/formUtils';

interface ComponentPanelProps {
  className?: string;
}

// 获取当前画布的实际宽度
function getCanvasWidth(): number {
  // 尝试找到画布主体元素（有明确设置宽度的那个）
  const canvasElement = document.querySelector('.canvas-content')?.parentElement;
  if (canvasElement && canvasElement.offsetWidth > 0) {
    return canvasElement.offsetWidth;
  }
  // 如果找不到画布，使用默认值
  return defaultGridConfig.containerWidth;
}

// 计算组件的实际像素尺寸（基于当前画布宽度）
function getComponentPixelSize(componentType: string): { width: number; height: number; gridW: number; gridH: number } {
  const definition = componentRegistry.get(componentType);
  const defaultSize = definition?.defaultSize ?? { w: 4, h: 4 };
  
  // 获取当前画布宽度
  const canvasWidth = getCanvasWidth();
  
  // 使用当前画布宽度计算网格配置
  const gridConfig: GridConfig = {
    ...defaultGridConfig,
    containerWidth: canvasWidth,
  };
  
  // 计算列宽
  const colWidth = calcColWidth(gridConfig);
  
  // 计算像素尺寸
  const width = defaultSize.w * colWidth + (defaultSize.w - 1) * GRID_MARGIN;
  const height = defaultSize.h * GRID_ROW_HEIGHT + (defaultSize.h - 1) * GRID_MARGIN;
  
  return { 
    width, 
    height, 
    gridW: defaultSize.w, 
    gridH: defaultSize.h 
  };
}

// 组件列表 - 按分类组织
const componentCategories = [
  {
    name: '基础组件',
    components: [
      { name: 'button', displayName: '按钮', icon: MousePointer },
      { name: 'text', displayName: '文本', icon: Type },
      { name: 'input', displayName: '输入框', icon: Square },
      { name: 'image', displayName: '图片', icon: Image },
    ],
  },
  {
    name: '表单组件',
    components: [
      { name: 'select', displayName: '下拉选择', icon: List },
      { name: 'checkbox', displayName: '复选框', icon: CheckSquare },
      { name: 'switch', displayName: '开关', icon: ToggleLeft },
      { name: 'textarea', displayName: '多行文本', icon: AlignLeft },
      { name: 'radio', displayName: '单选框', icon: CircleDot },
    ],
  },
  {
    name: '数据展示',
    components: [
      { name: 'table', displayName: '表格', icon: Table },
      { name: 'progress', displayName: '进度条', icon: Loader },
      { name: 'badge', displayName: '徽章', icon: Tag },
    ],
  },
  {
    name: '布局组件',
    components: [
      { name: 'container', displayName: '容器', icon: Layout },
      { name: 'form', displayName: '表单', icon: FileText },
      { name: 'modal', displayName: '弹窗', icon: Maximize2 },
      { name: 'divider', displayName: '分割线', icon: Minus },
    ],
  },
];

export function ComponentPanel({ className }: ComponentPanelProps) {
  useSignals();
  
  const [searchQuery, setSearchQuery] = useState('');
  const appContext = useCoreContext();
  const editor = useEditor();
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const transparentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentDragSizeRef = useRef<{ width: number; height: number } | null>(null);

  // 创建透明 Canvas（用于隐藏默认拖拽图像）
  // 关键：Canvas 必须在 DOM 中、在可见位置、且没有任何隐藏属性
  useEffect(() => {
    if (!transparentCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.id = 'transparent-drag-canvas';
      // Canvas 尺寸必须大于 0
      canvas.width = 1;
      canvas.height = 1;
      // 不绘制任何内容，保持透明
      // 关键样式：position: absolute 放在页面左上角，但不使用任何可能影响"可见性"的属性
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
      `;
      document.body.appendChild(canvas);
      transparentCanvasRef.current = canvas;
    }
    
    return () => {
      if (transparentCanvasRef.current?.parentNode) {
        document.body.removeChild(transparentCanvasRef.current);
        transparentCanvasRef.current = null;
      }
    };
  }, []);

  // 创建自定义拖拽预览层（跟随鼠标移动）
  useEffect(() => {
    if (!dragPreviewRef.current) {
      const preview = document.createElement('div');
      preview.id = 'component-drag-preview';
      preview.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        display: none;
      `;
      document.body.appendChild(preview);
      dragPreviewRef.current = preview;
    }
    
    // 监听全局 drag 事件来更新预览位置
    const handleGlobalDrag = (e: DragEvent) => {
      if (dragPreviewRef.current && currentDragSizeRef.current && e.clientX > 0 && e.clientY > 0) {
        const { width, height } = currentDragSizeRef.current;
        dragPreviewRef.current.style.left = `${e.clientX - width / 2}px`;
        dragPreviewRef.current.style.top = `${e.clientY - height / 2}px`;
      }
    };
    
    const handleGlobalDragEnd = () => {
      if (dragPreviewRef.current) {
        dragPreviewRef.current.style.display = 'none';
        dragPreviewRef.current.innerHTML = '';
      }
      currentDragSizeRef.current = null;
    };
    
    document.addEventListener('drag', handleGlobalDrag);
    document.addEventListener('dragend', handleGlobalDragEnd);
    
    return () => {
      document.removeEventListener('drag', handleGlobalDrag);
      document.removeEventListener('dragend', handleGlobalDragEnd);
      if (dragPreviewRef.current) {
        document.body.removeChild(dragPreviewRef.current);
        dragPreviewRef.current = null;
      }
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('componentType', componentType);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 使用透明 Canvas 隐藏默认拖拽图像
    // Canvas 放在可见位置，所以 setDragImage 能正确工作
    if (transparentCanvasRef.current) {
      e.dataTransfer.setDragImage(transparentCanvasRef.current, 0, 0);
    }
    
    // 获取组件的实际尺寸（基于当前画布宽度）
    const { width, height, gridW, gridH } = getComponentPixelSize(componentType);
    const definition = componentRegistry.get(componentType);
    const displayName = definition?.displayName ?? componentType;
    
    // 保存当前拖拽尺寸
    currentDragSizeRef.current = { width, height };
    
    // 创建并显示自定义拖拽预览
    if (dragPreviewRef.current) {
      const preview = dragPreviewRef.current;
      preview.innerHTML = '';
      
      // 创建预览内容
      const previewContent = document.createElement('div');
      previewContent.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%);
        border: 2px dashed rgba(59, 130, 246, 0.6);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
      `;
      
      // 组件名称
      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        font-size: 13px;
        font-weight: 600;
        color: rgba(59, 130, 246, 0.9);
      `;
      nameEl.textContent = displayName;
      
      // 尺寸信息
      const sizeEl = document.createElement('div');
      sizeEl.style.cssText = `
        font-size: 11px;
        font-weight: 500;
        color: rgba(59, 130, 246, 0.6);
        background: rgba(59, 130, 246, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
      `;
      sizeEl.textContent = `${gridW} × ${gridH}`;
      
      previewContent.appendChild(nameEl);
      previewContent.appendChild(sizeEl);
      preview.appendChild(previewContent);
      
      // 设置初始位置并显示
      preview.style.left = `${e.clientX - width / 2}px`;
      preview.style.top = `${e.clientY - height / 2}px`;
      preview.style.display = 'block';
    }
  };

  // 点击添加组件
  const handleAddComponent = (componentType: string) => {
    const definition = componentRegistry.get(componentType);
    const defaultSize = definition?.defaultSize ?? { w: 4, h: 5 };
    
    const components = appContext.currentPage?.components ?? [];
    const existingNames = components.map((c) => c.name);
    const name = generateComponentName(componentType, existingNames);
    
    // 计算放置位置（找到空位）
    const lastComp = components[components.length - 1];
    const x = 1;  // 从第 1 列开始
    const y = lastComp ? (lastComp.position.y + lastComp.position.h + 1) : 1;
    
    const newId = generateId('comp');
    
    // 如果是表单组件，添加初始子组件
    const children = componentType === 'form' 
      ? createFormInitialChildren(existingNames)
      : undefined;
    
    appContext.addComponent({
      id: newId,
      type: componentType,
      name,
      props: {},
      position: { x, y, w: defaultSize.w, h: defaultSize.h },
      children,
    });
    
    editor.selectedComponentId.value = newId;
  };

  // 过滤组件
  const filteredCategories = componentCategories
    .map(category => ({
      ...category,
      components: category.components.filter(comp =>
        comp.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(category => category.components.length > 0);

  return (
    <div className={cn('bg-background p-4 h-full overflow-y-auto', className)}>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="搜索组件..." 
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Component List */}
      <div className="space-y-5">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有找到匹配的组件</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.name}>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                {category.name}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {category.components.map((comp) => {
                  const Icon = comp.icon;
                  return (
                    <button
                      key={comp.name}
                      type="button"
                      draggable
                      onMouseDown={(e) => {
                        // 在 mousedown 时隐藏按钮内容
                        // 这样浏览器在 dragstart 时捕获的就是一个空的按钮
                        const button = e.currentTarget;
                        const children = button.children;
                        for (let i = 0; i < children.length; i++) {
                          (children[i] as HTMLElement).style.visibility = 'hidden';
                        }
                      }}
                      onDragStart={(e) => handleDragStart(e, comp.name)}
                      onDragEnd={(e) => {
                        // 拖拽结束后恢复按钮内容的可见性
                        const button = e.currentTarget;
                        const children = button.children;
                        for (let i = 0; i < children.length; i++) {
                          (children[i] as HTMLElement).style.visibility = '';
                        }
                      }}
                      onMouseUp={(e) => {
                        // 如果没有拖拽（只是点击），也要恢复可见性
                        const button = e.currentTarget;
                        const children = button.children;
                        for (let i = 0; i < children.length; i++) {
                          (children[i] as HTMLElement).style.visibility = '';
                        }
                      }}
                      onMouseLeave={(e) => {
                        // 鼠标离开时也恢复可见性（防止拖拽取消）
                        const button = e.currentTarget;
                        const children = button.children;
                        for (let i = 0; i < children.length; i++) {
                          (children[i] as HTMLElement).style.visibility = '';
                        }
                      }}
                      onClick={() => handleAddComponent(comp.name)}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-lg border bg-card hover:bg-accent hover:border-primary/30 cursor-pointer active:scale-95 transition-all"
                      title={`点击或拖拽添加 ${comp.displayName}`}
                      aria-label={`添加${comp.displayName}组件`}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs">{comp.displayName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
