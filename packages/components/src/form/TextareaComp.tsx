import { defineComp, prop } from '@lowcode-lite/core';
import { Textarea, cn } from '@lowcode-lite/ui';
import type { Ref, ReactNode, ChangeEvent } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const TextareaComp = defineComp({
  name: 'textarea',
  displayName: '多行文本',
  category: 'form',
  icon: 'lucide:align-left',
  description: '多行文本输入框',
  
  props: {
    value: prop.string(''),
    placeholder: prop.string('请输入内容...'),
    rows: prop.number(4),
    disabled: prop.boolean(false),
    readonly: prop.boolean(false),
    maxLength: prop.number(0),
  },
  
  expose: {
    states: ['value', 'disabled'],
  },
  
  defaultSize: { w: 8, h: 6 },
  
  view({ value, placeholder, rows, disabled, readonly, maxLength }, ref: Ref<HTMLTextAreaElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      handlers?.onChange('value', e.target.value);
    };
    
    return (
      <div className="relative w-full h-full">
        <Textarea
          ref={ref}
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          readOnly={readonly}
          maxLength={maxLength > 0 ? maxLength : undefined}
          className={cn('w-full h-full resize-none')}
          onChange={handleChange}
        />
        {maxLength > 0 && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {value.length}/{maxLength}
          </div>
        )}
      </div>
    );
  },
});
