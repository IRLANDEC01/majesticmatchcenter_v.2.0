import { vi, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
// Загружаем модели Mongoose для серверного окружения
import './src/models/index.js';

// --- Глобальные моки для серверной среды ---

// МОК ДЛЯ server-only: Решает проблему "This module cannot be imported from a
// Client Component module", которая некорректно возникает в тестовой среде Vitest
// при работе с кодом, предназначенным для Next.js App Router.
vi.mock('server-only', () => ({}));

// Мокаем Next.js Cache API
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// --- Redis отключен для тестов (используется memory cache) ---

// ✅ ИСПРАВЛЕНО: Убираем testcontainers для Redis
// Тесты используют CACHE_DRIVER=memory, поэтому Redis контейнер не нужен

beforeAll(async () => {
  console.log('🧪 Инициализация тестовой среды (memory cache)...');
  // Никаких контейнеров не запускаем - используем memory cache
  console.log('✅ Тестовая среда готова.');
});

afterAll(async () => {
  console.log('🧹 Очистка тестовой среды...');
  // Ничего не нужно останавливать для memory cache  
  console.log('👍 Тестовая среда очищена.');
});

// --- Настройка переменных окружения ---

console.log('Запуск файла настройки для СЕРВЕРНЫХ тестов (vitest.setup.server.mjs)...');

// Загружаем переменные окружения ИЗ .env.test
// Это гарантирует, что тесты всегда используют свою конфигурацию.
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// ✅ ИСПРАВЛЕНО: Принудительно используем memory cache в тестах
process.env.CACHE_DRIVER = 'memory';
process.env.REDIS_URL = 'redis://127.0.0.1:6379'; // Fallback для клиентов
if (!process.env.MEILISEARCH_HOST) {
  process.env.MEILISEARCH_HOST = 'http://dummy-host.com';
}
if (!process.env.MEILISEARCH_MASTER_KEY) {
  process.env.MEILISEARCH_MASTER_KEY = 'dummy-key';
}

// ✅ ДОБАВЛЕНО: S3 переменные для тестов
if (!process.env.S3_ENDPOINT) {
  process.env.S3_ENDPOINT = 'https://test-s3.example.com';
}
if (!process.env.S3_BUCKET) {
  process.env.S3_BUCKET = 'test-bucket';
}
if (!process.env.S3_REGION) {
  process.env.S3_REGION = 'us-east-1';
}
if (!process.env.S3_ACCESS_KEY_ID) {
  process.env.S3_ACCESS_KEY_ID = 'test-access-key';
}
if (!process.env.S3_SECRET_ACCESS_KEY) {
  process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
}
if (!process.env.NEXT_PUBLIC_S3_PUBLIC_URL) {
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL = 'https://test-cdn.example.com';
}

console.log('Серверные переменные окружения успешно сконфигурированы.'); 