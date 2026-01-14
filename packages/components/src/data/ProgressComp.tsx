import { defineComp, prop } from '@lowcode-lite/core';
import { Progress, cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const ProgressComp = defineComp({
  name: 'progress',
  displayName: '进度条',
  category: 'data',
  icon: 'lucide:loader',
  description: '进度条展示组件',
  
  props: {
    value: prop.number(60),
    max: prop.number(100),
    showLabel: prop.boolean(true),
    size: prop.select(['sm', 'md', 'lg'] as const, 'md'),
  },
  
  expose: {
    states: ['value'],
  },
  
  defaultSize: { w: 8, h: 2 },
  
  view({ value, max, showLabel, size }, ref: Ref<HTMLDivElement>) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    return (
      <div 
        ref={ref}
        className={cn('flex items-center gap-3 w-full h-full')}
      >
        <Progress
          value={percentage}
          className={cn(
            'flex-1',
            size === 'sm' && 'h-1.5',
            size === 'md' && 'h-2.5',
            size === 'lg' && 'h-4',
          )}
        />
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  },
});
