import { defineComp, prop } from '@lowcode-lite/core';
import { cn } from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const ImageComp = defineComp({
  name: 'image',
  displayName: '图片',
  category: 'basic',
  icon: 'lucide:image',
  description: '显示图片',
  
  props: {
    src: prop.string('https://via.placeholder.com/300x200'),
    alt: prop.string('图片'),
    objectFit: prop.select(['contain', 'cover', 'fill', 'none'] as const, 'cover'),
    borderRadius: prop.select(['none', 'sm', 'md', 'lg', 'full'] as const, 'none'),
  },
  
  expose: {
    states: ['src', 'alt'],
  },
  
  defaultSize: { w: 6, h: 6 },
  
  view({ src, alt, objectFit, borderRadius }, ref: Ref<HTMLImageElement>) {
    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full',
          // Border radius
          borderRadius === 'none' && 'rounded-none',
          borderRadius === 'sm' && 'rounded-sm',
          borderRadius === 'md' && 'rounded-md',
          borderRadius === 'lg' && 'rounded-lg',
          borderRadius === 'full' && 'rounded-full',
          // Object fit
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
        )}
      />
    );
  },
});
