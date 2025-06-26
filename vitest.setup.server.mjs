import { vi } from 'vitest';
import IORedisMock from 'ioredis-mock';
import dotenv from 'dotenv';
import path from 'path';
// Загружаем модели Mongoose для серверного окружения
import './src/models/index.js';

// --- Глобальные моки для серверной среды ---

// МОК ДЛЯ server-only: Решает проблему "This module cannot be imported from a
// Client Component module", которая некорректно возникает в тестовой среде Vitest
// при работе с кодом, предназначенным для Next.js App Router.
vi.mock('server-only', () => ({}));

// 1. Мокаем Redis
// Это позволяет изолировать тесты от реальной инфраструктуры Redis.
vi.mock('ioredis', () => ({
  default: IORedisMock,
}));

// 2. Мокаем Next.js Cache API
// Необходимо для Route Handlers, которые могут вызывать revalidatePath.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// --- Настройка переменных окружения ---

console.log('Запуск файла настройки для СЕРВЕРНЫХ тестов (vitest.setup.server.mjs)...');

// Загружаем переменные окружения ИЗ .env.test
// Это гарантирует, что тесты всегда используют свою конфигурацию.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Этот блок оставлен для обратной совместимости, если .env.test не будет найден.
// Но "золотой стандарт" - это использование .env.test.
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://mock-redis:6379';
}
if (!process.env.MEILISEARCH_HOST) {
  process.env.MEILISEARCH_HOST = 'http://dummy-host.com';
}
if (!process.env.MEILISEARCH_MASTER_KEY) {
  process.env.MEILISEARCH_MASTER_KEY = 'dummy-key';
}

console.log('Серверные переменные окружения успешно сконфигурированы.'); 