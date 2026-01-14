import { defineComp, prop } from '@lowcode-lite/core';
import { Checkbox, Label, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const CheckboxComp = defineComp({
  name: 'checkbox',
  displayName: '复选框',
  category: 'form',
  icon: 'lucide:check-square',
  description: '复选框组件',
  
  props: {
    checked: prop.boolean(false),
    label: prop.string('复选框'),
    disabled: prop.boolean(false),
  },
  
  expose: {
    states: ['checked', 'disabled'],
  },
  
  defaultSize: { w: 4, h: 2 },
  
  view({ checked, label, disabled }, ref: Ref<HTMLButtonElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    const id = `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    
    const handleCheckedChange = (newChecked: boolean) => {
      handlers?.onChange('checked', newChecked);
    };
    
    return (
      <div
        ref={ref as any}
        className={cn('flex items-center gap-2 w-full h-full')}
      >
        <Checkbox
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
