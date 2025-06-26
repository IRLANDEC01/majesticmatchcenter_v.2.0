import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// --- Глобальные моки для клиентской среды ---

console.log('Запуск файла настройки для КЛИЕНТСКИХ тестов (vitest.setup.client.mjs)...');

// Мок для SWR, чтобы предотвратить ошибки в тестах UI-компонентов,
// которые могут использовать этот хук для получения данных.
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