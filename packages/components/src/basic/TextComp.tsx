import { defineComp, prop } from '@lowcode-lite/core';
import { cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const TextComp = defineComp({
  name: 'text',
  displayName: '文本',
  category: 'basic',
  icon: 'lucide:type',
  description: '显示文本内容',
  
  props: {
    content: prop.string('这是一段文本'),
    fontSize: prop.select(['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'] as const, 'base'),
    fontWeight: prop.select(['normal', 'medium', 'semibold', 'bold'] as const, 'normal'),
    color: prop.color('#000000'),
    textAlign: prop.select(['left', 'center', 'right'] as const, 'left'),
  },
  
  expose: {
    states: ['content'],
  },
  
  defaultSize: { w: 6, h: 2 },
  
  view({ content, fontSize, fontWeight, color, textAlign }, ref: Ref<HTMLDivElement>) {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full h-full',
          // Font size
          fontSize === 'xs' && 'text-xs',
          fontSize === 'sm' && 'text-sm',
          fontSize === 'base' && 'text-base',
          fontSize === 'lg' && 'text-lg',
          fontSize === 'xl' && 'text-xl',
          fontSize === '2xl' && 'text-2xl',
          fontSize === '3xl' && 'text-3xl',
          // Font weight
          fontWeight === 'normal' && 'font-normal',
          fontWeight === 'medium' && 'font-medium',
          fontWeight === 'semibold' && 'font-semibold',
          fontWeight === 'bold' && 'font-bold',
          // Text align
          textAlign === 'left' && 'text-left',
          textAlign === 'center' && 'text-center',
          textAlign === 'right' && 'text-right',
        )}
        style={{ color }}
      >
        {content}
      </div>
    );
  },
});
