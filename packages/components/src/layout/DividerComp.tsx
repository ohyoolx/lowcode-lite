import { defineComp, prop } from '@lowcode-lite/core';
import { Separator, cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const DividerComp = defineComp({
  name: 'divider',
  displayName: '分割线',
  category: 'layout',
  icon: 'lucide:minus',
  description: '分割线组件',
  
  props: {
    text: prop.string(''),
    orientation: prop.select(['horizontal', 'vertical'] as const, 'horizontal'),
  },
  
  expose: {
    states: [],
  },
  
  defaultSize: { w: 12, h: 2 },
  
  view({ text, orientation }, ref: Ref<HTMLDivElement>) {
    if (!text) {
      return (
        <div 
          ref={ref}
          className={cn(
            'flex items-center justify-center w-full h-full',
            orientation === 'vertical' && 'flex-col'
          )}
        >
          <Separator orientation={orientation} className="flex-1" />
        </div>
      );
    }
    
    return (
      <div 
        ref={ref}
        className={cn(
          'flex items-center gap-4 w-full h-full',
          orientation === 'vertical' && 'flex-col'
        )}
      >
        <Separator orientation={orientation} className="flex-1" />
        <span className="text-sm text-muted-foreground whitespace-nowrap px-2">
          {text}
        </span>
        <Separator orientation={orientation} className="flex-1" />
      </div>
    );
  },
});
