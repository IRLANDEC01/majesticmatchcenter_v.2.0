const nextJest = require('next/jest');

// Предоставляем путь к нашему приложению Next.js для загрузки next.config.js и .env файлов в тестовой среде
const createJestConfig = nextJest({
  dir: './',
});

// Добавляем любую пользовательскую конфигурацию, которая будет передана в Jest
const customJestConfig = {
  // Добавляем дополнительную настройку для каждого теста с помощью jest-dom
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Если вы используете TypeScript с путями baseUrl, вам нужно будет настроить moduleNameMapper
  // для обработки псевдонимов модулей. В нашем случае для JS с jsconfig.json это тоже необходимо.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Указываем тестовую среду
  testEnvironment: 'jest-environment-jsdom',
};

// createJestConfig экспортируется таким образом, чтобы next/jest мог загрузить конфигурацию Next.js, которая является асинхронной
module.exports = createJestConfig(customJestConfig); 