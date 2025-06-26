// scripts/run-search-worker.ts

import { connectToDatabase, disconnectFromDatabase } from '../src/lib/db';
import worker from '../src/queues/search-worker'; // Импортируем сам воркер

console.log('[RunWorker] 🚀 Скрипт запуска воркера стартовал.');

async function startWorker() {
  try {
    console.log('[RunWorker] 🔌 Подключение к базе данных...');
    await connectToDatabase();
    console.log('[RunWorker] ✅ Успешно подключено к базе данных.');
    console.log(
      '[RunWorker] ✨ Воркер запущен и слушает очередь. Нажмите Ctrl+C для выхода.'
    );

    // Держим процесс живым
    const keepAlive = () => {};
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error('[RunWorker] ❌ Критическая ошибка при запуске воркера:', error);
    await gracefulShutdown(1);
  }
}

async function gracefulShutdown(exitCode = 0) {
  console.log('\n[RunWorker] 🛑 Получен сигнал завершения. Начинаю остановку...');
  try {
    // 1. Закрываем воркер. Он дождется завершения активной задачи.
    console.log('[RunWorker] ⏳ Закрытие воркера BullMQ...');
    await worker.close();
    console.log('[RunWorker] ✅ Воркер BullMQ успешно остановлен.');

    // 2. Отключаемся от БД
    await disconnectFromDatabase();
    console.log('[RunWorker] ✅ Успешно отключено от базы данных.');
  } catch (error) {
    console.error(
      '[RunWorker] ❌ Ошибка при корректном завершении работы:',
      error
    );
  } finally {
    console.log('[RunWorker] 👋 Процесс воркера завершен.');
    process.exit(exitCode);
  }
}

startWorker(); 