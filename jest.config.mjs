/** @type {import('jest').Config} */
const config = {
  // Указываем среду выполнения тестов
  testEnvironment: 'node',

  // Настройка трансформации файлов с помощью babel-jest
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },

  // Указываем Jest не игнорировать ESM-пакеты при трансформации.
  // Это ключевой момент для работы с Mongoose 8+.
  transformIgnorePatterns: [
    '/node_modules/(?!(mongoose|mongodb|bson|@mongodb-js|mongodb-memory-server|ioredis)/)',
  ],

  // Настройка псевдонимов путей для соответствия с jsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Файл для настроек перед запуском тестов (моки)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};

export default config; 