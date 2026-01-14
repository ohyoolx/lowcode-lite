/**
 * API 服务
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

export interface AppListItem {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface AppDetail {
  id: string;
  name: string;
  description: string | null;
  schema: any; // AppData
  status: 'draft' | 'published';
  publishedVersion: number | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppParams {
  name: string;
  description?: string;
  schema?: any;
}

export interface UpdateAppParams {
  name?: string;
  description?: string;
  schema?: any;
}

/**
 * API 请求封装
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 应用 API
 */
export const appsApi = {
  /**
   * 获取所有应用
   */
  async list(): Promise<AppListItem[]> {
    const result = await request<{ apps: AppListItem[] }>('/api/apps');
    return result.apps;
  },

  /**
   * 获取单个应用
   */
  async get(id: string): Promise<AppDetail> {
    const result = await request<{ app: AppDetail }>(`/api/apps/${id}`);
    return result.app;
  },

  /**
   * 创建应用
   */
  async create(params: CreateAppParams): Promise<{ id: string; name: string }> {
    return request<{ id: string; name: string }>('/api/apps', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * 更新应用
   */
  async update(id: string, params: UpdateAppParams): Promise<void> {
    await request<{ message: string }>(`/api/apps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  /**
   * 删除应用
   */
  async delete(id: string): Promise<void> {
    await request<{ message: string }>(`/api/apps/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * 发布应用
   */
  async publish(id: string): Promise<{ version: number }> {
    return request<{ message: string; version: number }>(`/api/apps/${id}/publish`, {
      method: 'POST',
    });
  },
};

/**
 * 健康检查
 */
export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>('/api/health');
    return true;
  } catch {
    return false;
  }
}
