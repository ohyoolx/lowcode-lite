import { defineComp, prop } from '@lowcode-lite/core';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@lowcode-lite/ui';
import type { Ref } from 'react';

export const TableComp = defineComp({
  name: 'table',
  displayName: '表格',
  category: 'data',
  icon: 'lucide:table',
  description: '数据表格组件',
  
  props: {
    // 数据源 - JSON 格式的数组
    data: prop.string(JSON.stringify([
      { id: 1, name: '张三', age: 28, email: 'zhangsan@example.com' },
      { id: 2, name: '李四', age: 32, email: 'lisi@example.com' },
      { id: 3, name: '王五', age: 25, email: 'wangwu@example.com' },
    ])),
    // 列配置 - JSON 格式
    columns: prop.string(JSON.stringify([
      { key: 'id', title: 'ID', width: 60 },
      { key: 'name', title: '姓名', width: 100 },
      { key: 'age', title: '年龄', width: 80 },
      { key: 'email', title: '邮箱' },
    ])),
    // 是否显示边框
    bordered: prop.boolean(true),
    // 是否显示斑马纹
    striped: prop.boolean(true),
    // 是否可悬停高亮
    hoverable: prop.boolean(true),
    // 是否紧凑模式
    compact: prop.boolean(false),
    // 空数据提示
    emptyText: prop.string('暂无数据'),
  },
  
  expose: {
    states: ['data'],
  },
  
  defaultSize: { w: 16, h: 12 },
  
  view({ data, columns, bordered, striped, compact, emptyText }, ref: Ref<HTMLDivElement>) {
    // 解析数据
    let rows: Record<string, unknown>[] = [];
    let cols: { key: string; title: string; width?: number }[] = [];
    
    try {
      rows = JSON.parse(data);
    } catch {
      rows = [];
    }
    
    try {
      cols = JSON.parse(columns);
    } catch {
      cols = [];
    }
    
    // 如果没有配置列，自动从数据推断
    if (cols.length === 0 && rows.length > 0) {
      cols = Object.keys(rows[0]).map(key => ({ key, title: key }));
    }
    
    return (
      <div 
        ref={ref}
        className={cn(
          'w-full h-full overflow-auto',
          bordered && 'border rounded-md'
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((col, idx) => (
                <TableHead 
                  key={col.key || idx}
                  className={cn(compact && 'px-3 py-2')}
                  style={{ width: col.width ? `${col.width}px` : 'auto' }}
                >
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={cols.length}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIdx) => (
                <TableRow 
                  key={(row.id as string | number) || rowIdx}
                  className={cn(
                    striped && rowIdx % 2 === 1 && 'bg-muted/50'
                  )}
                >
                  {cols.map((col, colIdx) => (
                    <TableCell 
                      key={`${rowIdx}-${col.key || colIdx}`}
                      className={cn(compact && 'px-3 py-2')}
                    >
                      {(row[col.key] as React.ReactNode) ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  },
});
