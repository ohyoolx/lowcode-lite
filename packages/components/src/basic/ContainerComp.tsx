import { defineComp, prop } from '@lowcode-lite/core';
import { Card, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';

export const ContainerComp = defineComp({
  name: 'container',
  displayName: '容器',
  category: 'layout',
  icon: 'lucide:layout',
  description: '可嵌套子组件的容器，支持溢出滚动',
  
  props: {
    backgroundColor: prop.color('#ffffff'),
    borderColor: prop.color('#e5e7eb'),
    borderWidth: prop.select(['0', '1', '2', '4'] as const, '1'),
    borderRadius: prop.select(['none', 'sm', 'md', 'lg', 'xl'] as const, 'md'),
    padding: prop.select(['0', '2', '4', '6', '8'] as const, '4'),
    shadow: prop.select(['none', 'sm', 'md', 'lg'] as const, 'none'),
    overflow: prop.select(['visible', 'hidden', 'auto', 'scroll'] as const, 'auto'),
  },
  
  // 标记为容器组件，可以接收子组件
  isContainer: true,
  
  defaultSize: { w: 12, h: 10 },
  
  view({ backgroundColor, borderColor, borderWidth, borderRadius, padding, shadow, overflow }, ref: Ref<HTMLDivElement>, children?: ReactNode) {
    return (
      <Card
        ref={ref}
        className={cn(
          'relative w-full h-full border-0',
          // Border radius
          borderRadius === 'none' && 'rounded-none',
          borderRadius === 'sm' && 'rounded-sm',
          borderRadius === 'md' && 'rounded-md',
          borderRadius === 'lg' && 'rounded-lg',
          borderRadius === 'xl' && 'rounded-xl',
          // Shadow
          shadow === 'none' && 'shadow-none',
          shadow === 'sm' && 'shadow-sm',
          shadow === 'md' && 'shadow-md',
          shadow === 'lg' && 'shadow-lg',
          // Padding
          padding === '0' && 'p-0',
          padding === '2' && 'p-2',
          padding === '4' && 'p-4',
          padding === '6' && 'p-6',
          padding === '8' && 'p-8',
        )}
        style={{
          backgroundColor,
          borderColor,
          borderWidth: `${borderWidth}px`,
          borderStyle: 'solid',
          overflow,
        }}
      >
        {/* 子组件将在这里渲染 */}
        {children}
        
        {/* 空状态提示 */}
        {!children && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm pointer-events-none">
            <span>拖拽组件到此容器</span>
          </div>
        )}
      </Card>
    );
  },
});
