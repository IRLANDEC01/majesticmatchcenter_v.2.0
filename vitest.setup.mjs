// jest.setup.js
import mongoose from 'mongoose';
import { vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import IORedisMock from 'ioredis-mock';
import { connectToDatabase, clearDatabase, disconnectFromDatabase } from '@/lib/db';
import '@/models';// Важнейший импорт для регистрации всех моделей!

let mongoServer;

// Подключаемся к базе данных один раз перед всеми тестами в файле
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await connectToDatabase();
  // Дожидаемся, пока все модели построят свои индексы.
  // Это критически важно для тестов, проверяющих уникальные ограничения.
  await Promise.all(Object.values(mongoose.models).map(model => model.syncIndexes()));
});

// Очищаем все коллекции перед каждым тестом (`it`) для обеспечения изоляции
beforeEach(async () => {
  await clearDatabase();
});

// Отключаемся от базы данных после всех тестов в файле
afterAll(async () => {
  await disconnectFromDatabase();
  await mongoServer.stop();
});

// Устанавливаем фиктивную переменную окружения для тестов.
// Это необходимо, чтобы пройти проверку в src/lib/redis.js,
// даже несмотря на то, что сам Redis мокается.
process.env.REDIS_URL = 'redis://mock-redis:6379';

// Это глобальная настройка для всех тестов.
// Мы используем vi.mock для того, чтобы перехватить все запросы к модулю 'ioredis'
// и подменить его на 'ioredis-mock'.
// Это позволяет нам изолировать тесты от реальной инфраструктуры Redis.
vi.mock('ioredis', () => ({
  default: IORedisMock,
}));

// Мок для кеша Next.js, который используется в Route Handlers
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Мок для SWR, чтобы предотвратить ошибки в тестах, которые могут затрагивать
// компоненты, использующие этот хук.
vi.mock('swr', () => ({
  __esModule: true, // Важно для моков модулей ES
  default: vi.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  })),
  mutate: vi.fn(),
}));