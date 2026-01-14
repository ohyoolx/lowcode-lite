import { defineComp, prop } from '@lowcode-lite/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  cn,
} from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';

export const ModalComp = defineComp({
  name: 'modal',
  displayName: '弹窗',
  category: 'layout',
  icon: 'lucide:square',
  description: '弹窗容器，覆盖画布显示，支持拖拽子组件',
  
  props: {
    // 显示控制
    visible: prop.boolean(true), // 编辑时默认显示，运行时可控制
    
    // 样式属性
    title: prop.string('弹窗标题'),
    width: prop.select(['sm', 'md', 'lg', 'xl', '2xl'] as const, 'md'),
    showHeader: prop.boolean(true),
    showCloseButton: prop.boolean(true),
    showFooter: prop.boolean(true),
    maskClosable: prop.boolean(true),
    
    // 按钮
    showCancelButton: prop.boolean(true),
    cancelButtonText: prop.string('取消'),
    showConfirmButton: prop.boolean(true),
    confirmButtonText: prop.string('确定'),
    
    // 事件
    onClose: prop.event(),
    onConfirm: prop.event(),
    onCancel: prop.event(),
  },
  
  // 标记为容器组件
  isContainer: true,
  
  // Modal 是覆盖层组件，不占用画布布局位置
  isOverlay: true,
  
  // 默认大小（仅用于数据存储，实际不使用）
  defaultSize: { w: 4, h: 2 },
  
  // 暴露方法和状态
  expose: {
    states: ['visible'],
    methods: {
      open: () => {},
      close: () => {},
      toggle: () => {},
    },
  },
  
  // Modal 的 view 函数在编辑器中不直接使用
  // 编辑器通过 Canvas 组件中的 ModalContent 来渲染
  // 这里的 view 仅用于预览模式或独立渲染场景
  view({ 
    visible,
    title,
    width,
    showHeader,
    showFooter,
    showCancelButton,
    cancelButtonText,
    showConfirmButton,
    confirmButtonText,
  }, ref: Ref<HTMLDivElement>, children?: ReactNode) {
    
    const widthClasses: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
    };
    
    // 如果不可见，返回空
    if (!visible) {
      return <div ref={ref} style={{ display: 'none' }} />;
    }
    
    return (
      <Dialog open={visible}>
        <DialogContent 
          ref={ref} 
          className={cn(widthClasses[width])}
        >
          {showHeader && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
          )}
          
          <div className="py-4">
            {children}
            
            {/* 空状态提示 */}
            {!children && (
              <div className="flex items-center justify-center h-20 text-muted-foreground/50 text-sm">
                <span>拖拽组件到弹窗内</span>
              </div>
            )}
          </div>
          
          {showFooter && (
            <DialogFooter>
              {showCancelButton && (
                <Button variant="outline">
                  {cancelButtonText}
                </Button>
              )}
              {showConfirmButton && (
                <Button>
                  {confirmButtonText}
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    );
  },
});
