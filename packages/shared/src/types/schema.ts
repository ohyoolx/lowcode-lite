import { z } from 'zod';
import { TempStateDefinitionSchema } from './tempState';
import { TransformerDefinitionSchema } from './transformer';
import { DataResponderDefinitionSchema } from './dataResponder';

// 组件位置
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

// 组件 Schema
export const ComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  props: z.record(z.any()),
  position: PositionSchema,
  children: z.array(z.lazy(() => ComponentSchema)).optional(),
});
export type ComponentData = z.infer<typeof ComponentSchema>;

// 查询 Schema - 使用 query.ts 中的 QueryDefinitionSchema
import { QueryDefinitionSchema } from './query';
export { QueryDefinitionSchema as QuerySchema };
export type QueryData = z.infer<typeof QueryDefinitionSchema>;

// 页面 Schema
export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  components: z.array(ComponentSchema),
});
export type PageData = z.infer<typeof PageSchema>;

// 应用 Schema
export const AppSchema = z.object({
  version: z.string(),
  pages: z.array(PageSchema),
  globalState: z.record(z.any()).optional(),
  queries: z.array(QueryDefinitionSchema).optional(),
  tempStates: z.array(TempStateDefinitionSchema).optional(),
  transformers: z.array(TransformerDefinitionSchema).optional(),
  dataResponders: z.array(DataResponderDefinitionSchema).optional(),
  theme: z.record(z.any()).optional(),
});
export type AppData = z.infer<typeof AppSchema>;

// 默认应用 Schema
export function createDefaultAppSchema(): AppData {
  return {
    version: '1.0.0',
    pages: [
      {
        id: 'page-1',
        name: '首页',
        path: '/',
        components: [],
      },
    ],
    globalState: {},
    queries: [],
    tempStates: [],
    transformers: [],
    dataResponders: [],
    theme: {},
  };
}
