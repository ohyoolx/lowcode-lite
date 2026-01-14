import { z } from 'zod';

// ==================== Query 数据源类型定义 ====================
// ==================== HTTP 方法 ====================
export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

// ==================== Body 类型 ====================
export const BodyTypeSchema = z.enum([
  'none',
  'application/json',
  'text/plain',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
]);
export type BodyType = z.infer<typeof BodyTypeSchema>;

// ==================== 键值对参数 ====================
export const KeyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().optional().default(true),
});
export type KeyValuePair = z.infer<typeof KeyValuePairSchema>;

// ==================== REST API 查询配置 ====================
export const RestApiConfigSchema = z.object({
  // HTTP 方法
  method: HttpMethodSchema.default('GET'),
  // 请求 URL（支持表达式）
  url: z.string(),
  // URL 参数
  params: z.array(KeyValuePairSchema).optional().default([]),
  // 请求头
  headers: z.array(KeyValuePairSchema).optional().default([]),
  // Body 类型
  bodyType: BodyTypeSchema.default('none'),
  // Body 内容（JSON 或纯文本，支持表达式）
  body: z.string().optional().default(''),
  // Form Data（用于 form-urlencoded 和 multipart/form-data）
  formData: z.array(KeyValuePairSchema).optional().default([]),
  // 超时时间（毫秒）
  timeout: z.number().optional().default(10000),
});
export type RestApiConfig = z.infer<typeof RestApiConfigSchema>;

// ==================== 数据源类型 ====================
export const DatasourceTypeSchema = z.enum(['restApi', 'graphql', 'js']);
export type DatasourceType = z.infer<typeof DatasourceTypeSchema>;

// ==================== Query 状态 ====================
export type QueryState = 'idle' | 'loading' | 'success' | 'error';

// ==================== Query 结果 ====================
export interface QueryResult<T = unknown> {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 错误信息 */
  message?: string;
  /** 响应状态码 */
  code?: number;
  /** 响应头 */
  headers?: Record<string, string>;
  /** 运行时间（毫秒） */
  runTime: number;
  /** 请求时间戳 */
  timestamp: number;
}

// ==================== Query 定义 Schema ====================
export const QueryDefinitionSchema = z.object({
  // 查询 ID
  id: z.string(),
  // 查询名称（用于表达式引用）
  name: z.string(),
  // 数据源类型
  type: DatasourceTypeSchema,
  // 配置（根据类型不同）
  config: z.union([
    RestApiConfigSchema,
    z.record(z.any()), // 其他类型配置
  ]),
  // 是否在初始化时运行
  runOnInit: z.boolean().optional().default(false),
  // 缓存时间（毫秒，0 表示不缓存）
  cacheTime: z.number().optional().default(0),
  // 是否自动取消之前的请求
  cancelPrevious: z.boolean().optional().default(true),
});
export type QueryDefinition = z.infer<typeof QueryDefinitionSchema>;

// ==================== Query 实例状态（运行时） ====================
export interface QueryInstance<T = unknown> {
  /** 查询定义 */
  definition: QueryDefinition;
  /** 当前状态 */
  state: QueryState;
  /** 是否正在加载 */
  isFetching: boolean;
  /** 最后一次结果 */
  lastResult?: QueryResult<T>;
  /** 最后一次运行时间 */
  lastRunTime?: number;
  /** 执行查询 */
  run: (args?: Record<string, unknown>) => Promise<QueryResult<T>>;
  /** 取消查询 */
  cancel: () => void;
  /** 重置状态 */
  reset: () => void;
}

// ==================== Query 暴露的值（用于表达式） ====================
export interface QueryExposedValues<T = unknown> {
  /** 响应数据 */
  data: T | undefined;
  /** 是否正在加载 */
  isFetching: boolean;
  /** 当前状态 */
  state: QueryState;
  /** 错误信息 */
  error?: string;
  /** 最后运行时间 */
  runTime?: number;
  /** 触发查询的方法 */
  run: (args?: Record<string, unknown>) => Promise<QueryResult<T>>;
}

// ==================== 默认 Query 配置 ====================
export function createDefaultRestApiQuery(id: string, name: string): QueryDefinition {
  return {
    id,
    name,
    type: 'restApi',
    config: {
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      bodyType: 'none',
      body: '',
      formData: [],
      timeout: 10000,
    } satisfies RestApiConfig,
    runOnInit: false,
    cacheTime: 0,
    cancelPrevious: true,
  };
}
