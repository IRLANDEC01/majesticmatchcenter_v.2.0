import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  // Добавляем плагин. Он автоматически прочитает tsconfig.json
  // и настроит алиасы для Vitest.
  plugins: [tsconfigPaths()],
  test: {
    // Включаем глобальные переменные (describe, it, expect), чтобы не импортировать их вручную.
    globals: true,
    // Указываем, что наша тестовая среда — Node.js, а не браузер.
    environment: 'node',
    // Жестко отключаем параллельное выполнение тестов.
    // Это решает проблему состояния гонки, когда несколько тестовых файлов
    // одновременно пытаются создать/удалить индексы в одной и той же БД.
    threads: false,
    // Увеличиваем глобальный таймаут для всех тестов до 30 секунд.
    // Это важно для интеграционных тестов, работающих с реальной БД.
    testTimeout: 30000,
    // Указываем файл, который будет выполняться перед всеми тестами.
    // Сюда мы перенесем логику подключения к БД.
    setupFiles: ['./vitest.setup.mjs'],
    // Настройки для отчетов о покрытии кода тестами.
    coverage: {
      provider: 'v8', // Используем быстрый провайдер v8
      reporter: ['text', 'json', 'html'], // Форматы отчетов
      // Файлы и папки, которые нужно игнорировать при сборе покрытия.
      exclude: [
        'node_modules',
        '*.config.mjs',
        '*.config.js',
        'coverage',
        'scripts',
        'tests',
        'dist',
        '.next',
        'public',
        'playwright-report',
        'src/lib/test-helpers.js',
        'src/models/index.js',
      ],
    },
  },
}); 