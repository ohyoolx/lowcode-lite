import { defineComp, prop } from '@lowcode-lite/core';
import { Input, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode, ChangeEvent } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const InputComp = defineComp({
  name: 'input',
  displayName: '输入框',
  category: 'basic',
  icon: 'lucide:text-cursor-input',
  description: '文本输入框',
  
  props: {
    value: prop.string(''),
    placeholder: prop.string('请输入...'),
    type: prop.select(['text', 'password', 'email', 'number'] as const, 'text'),
    disabled: prop.boolean(false),
    readonly: prop.boolean(false),
  },
  
  expose: {
    states: ['value', 'disabled'],
  },
  
  defaultSize: { w: 6, h: 2 },
  
  view({ value, placeholder, type, disabled, readonly }, ref: Ref<HTMLInputElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      handlers?.onChange('value', e.target.value);
    };
    
    return (
      <Input
        ref={ref}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readonly}
        className={cn('h-full w-full')}
        onChange={handleChange}
      />
    );
  },
});
