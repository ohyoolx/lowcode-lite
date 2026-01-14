import { defineComp, prop } from '@lowcode-lite/core';
import { Button, cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const ButtonComp = defineComp({
  name: 'button',
  displayName: '按钮',
  category: 'basic',
  icon: 'lucide:mouse-pointer',
  description: '可点击的按钮组件',
  
  props: {
    text: prop.string('按钮'),
    variant: prop.select(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const, 'default'),
    size: prop.select(['default', 'sm', 'lg'] as const, 'default'),
    disabled: prop.boolean(false),
    loading: prop.boolean(false),
  },
  
  expose: {
    states: ['text', 'disabled', 'loading'],
  },
  
  defaultSize: { w: 4, h: 2 },
  
  view({ text, variant, size, disabled, loading }, ref: Ref<HTMLButtonElement>) {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        disabled={disabled}
        loading={loading}
        className={cn('w-full h-full')}
      >
        {text}
      </Button>
    );
  },
});
