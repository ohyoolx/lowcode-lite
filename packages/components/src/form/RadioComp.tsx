import { defineComp, prop } from '@lowcode-lite/core';
import { RadioGroup, RadioGroupItem, Label, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const RadioComp = defineComp({
  name: 'radio',
  displayName: '单选框',
  category: 'form',
  icon: 'lucide:circle-dot',
  description: '单选框组件',
  
  props: {
    value: prop.string(''),
    options: prop.string('选项1,选项2,选项3'),
    direction: prop.select(['horizontal', 'vertical'] as const, 'horizontal'),
    disabled: prop.boolean(false),
  },
  
  expose: {
    states: ['value', 'disabled'],
  },
  
  defaultSize: { w: 8, h: 2 },
  
  view({ value, options, direction, disabled }, ref: Ref<HTMLDivElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    // 解析选项
    const optionList = options.split(',').map(opt => opt.trim()).filter(Boolean);
    
    const handleValueChange = (newValue: string) => {
      handlers?.onChange('value', newValue);
    };
    
    return (
      <RadioGroup
        ref={ref}
        value={value}
        disabled={disabled}
        onValueChange={handleValueChange}
        className={cn(
          'w-full h-full',
          direction === 'horizontal' ? 'flex flex-row flex-wrap gap-4' : 'flex flex-col gap-2'
        )}
      >
        {optionList.map((opt, idx) => {
          const id = `radio-${idx}-${Math.random().toString(36).slice(2, 9)}`;
          return (
            <div key={idx} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={id} />
              <Label
                htmlFor={id}
                className={cn(
                  'text-sm cursor-pointer select-none',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {opt}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    );
  },
});
