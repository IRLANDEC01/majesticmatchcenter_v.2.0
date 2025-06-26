import searchQueue from '../src/queues/search-queue';

/**
 * Этот скрипт полностью очищает очередь 'search-sync'.
 * ВНИМАНИЕ: Это необратимая операция. Все задачи, включая
 * активные, ожидающие и завершенные, будут удалены.
 */
async function clearSearchQueue() {
  console.log("🧹 Очистка очереди 'search-sync'...");
  try {
    // Подключаемся к Redis через экземпляр очереди
    await searchQueue.waitUntilReady();
    
    // Полностью уничтожаем все данные, связанные с этой очередью
    await searchQueue.obliterate();

    console.log("✅ Очередь 'search-sync' успешно очищена.");
  } catch (error) {
    console.error('❌ Ошибка при очистке очереди:', error);
    process.exit(1);
  } finally {
    // Закрываем соединение, чтобы скрипт мог завершиться
    await searchQueue.close();
    console.log('🔌 Соединение с Redis закрыто.');
    process.exit(0);
  }
}

clearSearchQueue(); 