import { defineComp, prop } from '@lowcode-lite/core';
import { Badge, cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const BadgeComp = defineComp({
  name: 'badge',
  displayName: '徽章',
  category: 'data',
  icon: 'lucide:tag',
  description: '徽章标签组件',
  
  props: {
    text: prop.string('Badge'),
    variant: prop.select(['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info'] as const, 'default'),
  },
  
  expose: {
    states: ['text'],
  },
  
  defaultSize: { w: 3, h: 2 },
  
  view({ text, variant }, ref: Ref<HTMLDivElement>) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <Badge ref={ref} variant={variant} className={cn('shrink-0')}>
          {text}
        </Badge>
      </div>
    );
  },
});
