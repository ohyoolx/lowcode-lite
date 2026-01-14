import { defineComp, prop } from '@lowcode-lite/core';
import { cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode, FormEvent } from 'react';

export const FormComp = defineComp({
  name: 'form',
  displayName: '表单',
  category: 'layout',
  icon: 'lucide:file-text',
  description: '表单容器，可收集子组件的值并提交',
  
  props: {
    // 样式属性
    backgroundColor: prop.color('#ffffff'),
    borderColor: prop.color('#e5e7eb'),
    borderWidth: prop.select(['0', '1', '2', '4'] as const, '1'),
    borderRadius: prop.select(['none', 'sm', 'md', 'lg', 'xl'] as const, 'md'),
    padding: prop.select(['0', '2', '4', '6', '8'] as const, '4'),
    
    // 事件
    onSubmit: prop.event(),
    onReset: prop.event(),
  },
  
  // 标记为容器组件
  isContainer: true,
  
  defaultSize: { w: 16, h: 12 },
  
  // 暴露方法和状态
  // 注意：values 是在 DataPanel 中动态计算的，包含所有子组件的值
  expose: {
    states: [],
    methods: {
      submit: () => {},
      reset: () => {},
      getValues: () => {},
      setValues: () => {},
    },
  },
  
  view({ 
    backgroundColor, 
    borderColor, 
    borderWidth, 
    borderRadius, 
    padding,
  }, ref: Ref<HTMLFormElement>, children?: ReactNode) {
    
    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      // TODO: 收集子组件的值并触发 onSubmit 事件
      console.log('Form submitted');
    };
    
    // 计算内容区域的边距（像素）
    const paddingMap: Record<string, number> = {
      '0': 0,
      '2': 8,
      '4': 16,
      '6': 24,
      '8': 32,
    };
    const paddingPx = paddingMap[padding] ?? 16;
    
    return (
      <form
        ref={ref}
        className={cn(
          'relative w-full h-full bg-card text-card-foreground shadow-sm overflow-hidden',
          // Border radius
          borderRadius === 'none' && 'rounded-none',
          borderRadius === 'sm' && 'rounded-sm',
          borderRadius === 'md' && 'rounded-md',
          borderRadius === 'lg' && 'rounded-lg',
          borderRadius === 'xl' && 'rounded-xl',
        )}
        style={{
          backgroundColor,
          borderColor,
          borderWidth: `${borderWidth}px`,
          borderStyle: 'solid',
        }}
        onSubmit={handleSubmit}
        // 标记内容区域的边界（供 ComponentWrapper 读取）
        // 现在整个表单都是内容区域，只有 padding 作为边距
        data-content-insets={JSON.stringify({
          top: paddingPx,
          bottom: paddingPx,
          left: paddingPx,
          right: paddingPx,
        })}
      >
        {/* 子组件内容区域 - 整个表单都是可放置区域 */}
        <div 
          className={cn(
            'absolute inset-0 overflow-visible',
            // Padding
            padding === '0' && 'p-0',
            padding === '2' && 'p-2',
            padding === '4' && 'p-4',
            padding === '6' && 'p-6',
            padding === '8' && 'p-8',
          )}
          data-form-content-area="true"
        >
          {/* 内部容器 - 子组件相对于此定位 */}
          <div className="relative w-full h-full">
            {children}
            
            {/* 空状态提示 */}
            {!children && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm pointer-events-none">
                <span>拖拽组件到此处</span>
              </div>
            )}
          </div>
          
          {/* 可放置区域虚线框指示（拖拽时通过 JS 控制显示） */}
          <div 
            className="form-drop-zone-indicator absolute inset-0 border-2 border-dashed border-primary/40 rounded-md pointer-events-none opacity-0 transition-opacity duration-200 bg-primary/5"
            style={{ margin: -2, zIndex: 10 }}
          />
        </div>
      </form>
    );
  },
});
