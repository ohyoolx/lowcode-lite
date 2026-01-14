import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = './data/lowcode.db';

// 确保数据目录存在
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);

// 启用 WAL 模式以提高性能
sqlite.exec('PRAGMA journal_mode = WAL');

// 初始化数据库表
function initDatabase() {
  // 创建 users 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 创建 apps 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      schema TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      published_version INTEGER,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 创建 app_versions 表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_versions (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      schema TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      created_by TEXT NOT NULL
    )
  `);

  // 创建匿名用户（如果不存在）
  const now = Date.now();
  sqlite.exec(`
    INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at)
    VALUES ('anonymous', 'anonymous@localhost', 'Anonymous', ${now}, ${now})
  `);

  console.log('Database initialized');
}

// 初始化
initDatabase();

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;

export { schema };
