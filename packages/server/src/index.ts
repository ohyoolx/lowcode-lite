import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { appsRouter } from './routes/apps';
import { healthRouter } from './routes/health';

const app = new Hono();

// 中间件
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'],
  credentials: true,
}));

// 路由
app.route('/api/health', healthRouter);
app.route('/api/apps', appsRouter);

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = parseInt(process.env.PORT || '4001');

console.log(`🚀 LowCode Lite Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
