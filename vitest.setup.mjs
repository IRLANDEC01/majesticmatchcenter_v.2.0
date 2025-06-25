// jest.setup.js
import { vi } from 'vitest';
import IORedisMock from 'ioredis-mock';
// Заменяем алиас на относительный путь, т.к. плагины Vitest не работают для setup-файлов.
import './src/models/index.js';

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

/**
 * Этот файл выполняется один раз перед запуском всех тестов.
 * Он идеально подходит для глобальной настройки тестового окружения.
 */

console.log('Запуск глобального файла настройки Vitest (vitest.setup.mjs)...');

// Устанавливаем фиктивные переменные окружения для MeiliSearch,
// чтобы конструктор SearchService не вызывал ошибку в тестах.
process.env.MEILISEARCH_HOST = 'http://dummy-host.com';
process.env.MEILISEARCH_MASTER_KEY = 'dummy-key';

console.log('Переменные окружения для MeiliSearch установлены.');

// В будущем здесь можно будет добавить другую глобальную логику,
// например, mock для winston logger или других сервисов.