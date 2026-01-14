import { defineComp, prop } from '@lowcode-lite/core';
import { Switch, Label, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const SwitchComp = defineComp({
  name: 'switch',
  displayName: '开关',
  category: 'form',
  icon: 'lucide:toggle-left',
  description: '开关切换组件',
  
  props: {
    checked: prop.boolean(false),
    label: prop.string('开关'),
    disabled: prop.boolean(false),
  },
  
  expose: {
    states: ['checked', 'disabled'],
  },
  
  defaultSize: { w: 4, h: 2 },
  
  view({ checked, label, disabled }, ref: Ref<HTMLButtonElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    const id = `switch-${Math.random().toString(36).slice(2, 9)}`;
    
    const handleCheckedChange = (newChecked: boolean) => {
      handlers?.onChange('checked', newChecked);
    };
    
    return (
      <div
        ref={ref as any}
        className={cn('flex items-center gap-3 w-full h-full')}
      >
        <Switch
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={handleCheckedChange}
        />
        <Label
          htmlFor={id}
          className={cn(
            'text-sm cursor-pointer select-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {label}
        </Label>
      </div>
    );
  },
});
