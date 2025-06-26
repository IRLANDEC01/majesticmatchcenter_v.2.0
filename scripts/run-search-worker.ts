// scripts/run-search-worker.ts

import { connectToDatabase, disconnectFromDatabase } from '../src/lib/db';
import '../src/queues/search-worker'; // Важно: просто импортируем, чтобы запустить код воркера

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
    setInterval(keepAlive, 1000 * 60 * 60); // Просто чтобы процесс не завершился
  } catch (error) {
    console.error('[RunWorker] ❌ Критическая ошибка при запуске воркера:', error);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  console.log('\n[RunWorker] 🛑 Получен сигнал завершения. Начинаю остановку...');
  try {
    await disconnectFromDatabase();
    console.log('[RunWorker] ✅ Успешно отключено от базы данных.');
  } catch (error) {
    console.error(
      '[RunWorker] ❌ Ошибка при отключении от базы данных:',
      error
    );
  } finally {
    console.log('[RunWorker] 👋 Процесс воркера завершен.');
    process.exit(0);
  }
}

startWorker(); 