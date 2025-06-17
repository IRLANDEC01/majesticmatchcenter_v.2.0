import nextJest from 'next/jest.js';

// Предоставляем путь к приложению Next.js для загрузки next.config.js и .env
const createJestConfig = nextJest({ dir: './' });

// Базовая конфигурация Jest, которую мы хотим использовать
const customJestConfig = {
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Говорим Jest не трансформировать модули, которые уже являются ESM.
  // Это ключевое исправление для ошибки 'Must use import to load ES Module'.
  transformIgnorePatterns: [
    '/node_modules/(?!(mongoose|mongodb|bson|@mongodb-js|mongodb-memory-server)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
};

// Экспортируем функцию, которую next/jest может выполнить для создания финальной конфигурации.
export default createJestConfig(customJestConfig); 