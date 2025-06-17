import nextJest from 'next/jest.js';

// Предоставляем путь к приложению Next.js для загрузки next.config.js и .env
const createJestConfig = nextJest({ dir: './' });

// Базовая конфигурация Jest, которую мы хотим использовать
const customJestConfig = {
  preset: '@shelf/jest-mongodb',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// Экспортируем функцию, которую next/jest может выполнить для создания финальной конфигурации.
export default createJestConfig(customJestConfig); 