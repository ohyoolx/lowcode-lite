import { defineComp, prop } from '@lowcode-lite/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@lowcode-lite/ui';
import type { Ref, ReactNode } from 'react';
import type { ComponentHandlers } from '@lowcode-lite/shared';

export const SelectComp = defineComp({
  name: 'select',
  displayName: '下拉选择',
  category: 'form',
  icon: 'lucide:list',
  description: '下拉选择框组件',
  
  props: {
    value: prop.string(''),
    placeholder: prop.string('请选择...'),
    options: prop.string('选项1,选项2,选项3'),
    disabled: prop.boolean(false),
  },
  
  expose: {
    states: ['value', 'disabled'],
  },
  
  defaultSize: { w: 6, h: 2 },
  
  view({ value, placeholder, options, disabled }, ref: Ref<HTMLButtonElement>, _children?: ReactNode, handlers?: ComponentHandlers) {
    // 解析选项（支持逗号分隔的字符串）
    const optionList = options.split(',').map(opt => opt.trim()).filter(Boolean);
    
    const handleValueChange = (newValue: string) => {
      handlers?.onChange('value', newValue);
    };
    
    return (
      <div ref={ref as any} className={cn('w-full h-full')}>
        <Select value={value} disabled={disabled} onValueChange={handleValueChange}>
          <SelectTrigger className="w-full h-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {optionList.map((opt, idx) => (
              <SelectItem key={idx} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
});
