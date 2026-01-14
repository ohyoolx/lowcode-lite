import { Hono } from 'hono';
import { db, schema, rawDb } from '../db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppData } from '@lowcode-lite/shared';

export const appsRouter = new Hono();

// 获取所有应用
appsRouter.get('/', async (c) => {
  try {
    const allApps = await db.select({
      id: schema.apps.id,
      name: schema.apps.name,
      description: schema.apps.description,
      status: schema.apps.status,
      createdAt: schema.apps.createdAt,
      updatedAt: schema.apps.updatedAt,
    }).from(schema.apps);
    
    return c.json({ apps: allApps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    return c.json({ error: 'Failed to fetch apps' }, 500);
  }
});

// 获取单个应用
appsRouter.get('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    // 使用原生查询避免 Drizzle ORM 的 JSON 解析问题
    const stmt = rawDb.prepare('SELECT * FROM apps WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      return c.json({ error: 'App not found' }, 404);
    }
    
    const app = {
      id: row.id,
      name: row.name,
      description: row.description,
      schema: JSON.parse(row.schema),
      status: row.status,
      publishedVersion: row.published_version,
      ownerId: row.owner_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
    
    return c.json({ app });
  } catch (error) {
    console.error('Error fetching app:', error);
    return c.json({ error: 'Failed to fetch app' }, 500);
  }
});

// 创建应用
appsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json<{ name: string; description?: string; schema?: AppData }>();
    
    const id = nanoid();
    const now = new Date();
    
    // 默认 schema
    const defaultSchema: AppData = body.schema ?? {
      id,
      name: body.name,
      version: 1,
      pages: [
        {
          id: nanoid(),
          name: '首页',
          path: '/',
          components: [],
        },
      ],
      dataSources: [],
      queries: [],
      globalState: {},
    };
    
    // 序列化 schema 为 JSON 字符串
    await db.insert(schema.apps).values({
      id,
      name: body.name,
      description: body.description ?? null,
      schema: JSON.stringify(defaultSchema),
      status: 'draft',
      ownerId: 'anonymous', // 暂时使用匿名用户
      createdAt: now,
      updatedAt: now,
    });
    
    return c.json({ 
      id, 
      name: body.name,
      message: 'App created successfully' 
    }, 201);
  } catch (error) {
    console.error('Error creating app:', error);
    return c.json({ error: 'Failed to create app' }, 500);
  }
});

// 更新应用
appsRouter.put('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const body = await c.req.json<{ name?: string; description?: string; schema?: AppData }>();
    
    const existing = await db.select().from(schema.apps).where(eq(schema.apps.id, id)).get();
    if (!existing) {
      return c.json({ error: 'App not found' }, 404);
    }
    
    const updates: Partial<typeof schema.apps.$inferInsert> = {
      updatedAt: new Date(),
    };
    
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.schema) updates.schema = JSON.stringify(body.schema);
    
    await db.update(schema.apps).set(updates).where(eq(schema.apps.id, id));
    
    return c.json({ message: 'App updated successfully' });
  } catch (error) {
    console.error('Error updating app:', error);
    return c.json({ error: 'Failed to update app' }, 500);
  }
});

// 删除应用
appsRouter.delete('/:id', async (c) => {
  const { id } = c.req.param();
  
  try {
    const existing = await db.select().from(schema.apps).where(eq(schema.apps.id, id)).get();
    if (!existing) {
      return c.json({ error: 'App not found' }, 404);
    }
    
    await db.delete(schema.apps).where(eq(schema.apps.id, id));
    
    return c.json({ message: 'App deleted successfully' });
  } catch (error) {
    console.error('Error deleting app:', error);
    return c.json({ error: 'Failed to delete app' }, 500);
  }
});

// 发布应用
appsRouter.post('/:id/publish', async (c) => {
  const { id } = c.req.param();
  
  try {
    const app = await db.select().from(schema.apps).where(eq(schema.apps.id, id)).get();
    if (!app) {
      return c.json({ error: 'App not found' }, 404);
    }
    
    const newVersion = (app.publishedVersion ?? 0) + 1;
    
    // 创建版本记录
    await db.insert(schema.appVersions).values({
      id: nanoid(),
      appId: id,
      version: newVersion,
      schema: app.schema, // 已经是 JSON 字符串
      createdAt: new Date(),
      createdBy: 'anonymous',
    });
    
    // 更新应用状态
    await db.update(schema.apps).set({
      status: 'published',
      publishedVersion: newVersion,
      updatedAt: new Date(),
    }).where(eq(schema.apps.id, id));
    
    return c.json({ 
      message: 'App published successfully',
      version: newVersion 
    });
  } catch (error) {
    console.error('Error publishing app:', error);
    return c.json({ error: 'Failed to publish app' }, 500);
  }
});
