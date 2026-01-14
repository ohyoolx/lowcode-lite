import type {
  HttpMethod,
  RestApiConfig,
  QueryResult,
  KeyValuePair,
  BodyType,
} from '@lowcode-lite/shared';

/**
 * HTTP 请求配置
 */
export interface HttpRequestConfig {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * HTTP 响应
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * 将 KeyValuePair 数组转换为对象
 */
function keyValuePairsToRecord(pairs: KeyValuePair[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    if (pair.enabled !== false && pair.key) {
      result[pair.key] = pair.value;
    }
  }
  return result;
}

/**
 * 构建 URL 查询字符串
 */
function buildQueryString(params: Record<string, string>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key) {
      searchParams.append(key, value);
    }
  }
  return searchParams.toString();
}

/**
 * 解析响应头
 */
function parseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * 根据 Body 类型构建请求体
 */
function buildRequestBody(
  bodyType: BodyType,
  body: string,
  formData: KeyValuePair[]
): { body?: BodyInit; contentType?: string } {
  switch (bodyType) {
    case 'none':
      return {};

    case 'application/json':
      return {
        body: body || '{}',
        contentType: 'application/json',
      };

    case 'text/plain':
      return {
        body: body || '',
        contentType: 'text/plain',
      };

    case 'application/x-www-form-urlencoded': {
      const searchParams = new URLSearchParams();
      for (const pair of formData) {
        if (pair.enabled !== false && pair.key) {
          searchParams.append(pair.key, pair.value);
        }
      }
      return {
        body: searchParams,
        contentType: 'application/x-www-form-urlencoded',
      };
    }

    case 'multipart/form-data': {
      const fd = new FormData();
      for (const pair of formData) {
        if (pair.enabled !== false && pair.key) {
          fd.append(pair.key, pair.value);
        }
      }
      // 不设置 content-type，让浏览器自动添加 boundary
      return { body: fd };
    }

    default:
      return {};
  }
}

/**
 * 统一的 HTTP 客户端
 * 封装所有对外请求，支持超时、取消、错误处理
 */
export class HttpClient {
  /** 默认超时时间（毫秒） */
  private defaultTimeout: number;

  /** 存储请求的 AbortController，用于取消请求 */
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options?: { defaultTimeout?: number }) {
    this.defaultTimeout = options?.defaultTimeout ?? 10000;
  }

  /**
   * 发送 HTTP 请求
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url, method, headers = {}, params = {}, body, timeout, signal } = config;

    // 构建完整 URL
    let fullUrl = url;
    const queryString = buildQueryString(params);
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }

    // 设置超时
    const timeoutMs = timeout ?? this.defaultTimeout;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // 合并信号（外部取消 + 超时取消）
    const combinedSignal = signal
      ? this.combineAbortSignals(signal, abortController.signal)
      : abortController.signal;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          ...headers,
        },
        body: body as BodyInit | undefined,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      // 尝试解析响应体
      const contentType = response.headers.get('content-type') ?? '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = (await response.text()) as T;
      } else {
        // 其他类型尝试返回 blob
        try {
          data = await response.json();
        } catch {
          data = (await response.text()) as T;
        }
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: parseHeaders(response.headers),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 从 RestApiConfig 执行请求
   */
  async executeRestApi<T = unknown>(
    config: RestApiConfig,
    requestId?: string,
    evaluateExpression?: (expr: string, context: Record<string, unknown>) => unknown,
    context?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    // 如果有请求 ID，先取消之前的同 ID 请求
    if (requestId) {
      this.cancel(requestId);
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    if (requestId) {
      this.abortControllers.set(requestId, abortController);
    }

    try {
      // 解析 URL（可能包含表达式）
      let url = config.url;
      if (evaluateExpression && context) {
        url = String(evaluateExpression(config.url, context) ?? config.url);
      }

      // 解析参数
      const params = keyValuePairsToRecord(config.params ?? []);

      // 解析请求头
      const headers = keyValuePairsToRecord(config.headers ?? []);

      // 解析请求体
      let bodyContent = config.body ?? '';
      if (evaluateExpression && context && bodyContent) {
        const evaluated = evaluateExpression(bodyContent, context);
        bodyContent = typeof evaluated === 'string' ? evaluated : JSON.stringify(evaluated);
      }

      const { body, contentType } = buildRequestBody(
        config.bodyType,
        bodyContent,
        config.formData ?? []
      );

      if (contentType) {
        headers['Content-Type'] = contentType;
      }

      // 发送请求
      const response = await this.request<T>({
        url,
        method: config.method,
        headers,
        params,
        body,
        timeout: config.timeout,
        signal: abortController.signal,
      });

      const endTime = Date.now();

      // 清理 AbortController
      if (requestId) {
        this.abortControllers.delete(requestId);
      }

      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data,
        code: response.status,
        headers: response.headers,
        runTime: endTime - startTime,
        timestamp: endTime,
        message: response.status >= 400 ? response.statusText : undefined,
      };
    } catch (error) {
      const endTime = Date.now();

      // 清理 AbortController
      if (requestId) {
        this.abortControllers.delete(requestId);
      }

      // 判断是否是取消请求
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          data: undefined as T,
          message: 'Request cancelled',
          runTime: endTime - startTime,
          timestamp: endTime,
        };
      }

      return {
        success: false,
        data: undefined as T,
        message: error instanceof Error ? error.message : String(error),
        runTime: endTime - startTime,
        timestamp: endTime,
      };
    }
  }

  /**
   * 取消指定请求
   */
  cancel(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  /**
   * 合并多个 AbortSignal
   */
  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', () => {
        controller.abort(signal.reason);
      });
    }

    return controller.signal;
  }
}

/**
 * 全局 HTTP 客户端实例
 */
export const httpClient = new HttpClient();
