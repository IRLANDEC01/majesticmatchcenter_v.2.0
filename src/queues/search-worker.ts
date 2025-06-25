import { Job } from 'bull';
import searchQueue from './search-queue';
import searchService from '../lib/domain/search/search-service';

// Определяем интерфейс для данных задачи, чтобы обеспечить типизацию
interface SearchSyncJobData {
  action: 'update' | 'delete';
  entity: string;
  entityId: string;
}

/**
 * Обработчик задач для очереди 'search-sync'.
 * Эта функция вызывается для каждой задачи, поступающей в очередь.
 */
const processSearchSyncJob = async (job: Job<SearchSyncJobData>) => {
  const { action, entity, entityId } = job.data;
  const jobDescription = `(Job ID: ${job.id}, Entity: ${entity}, ID: ${entityId}, Action: ${action})`;

  try {
    console.log(`[SearchWorker] 🔄 Начата обработка задачи ${jobDescription}`);

    await searchService.syncDocument(action, entity, entityId);

    console.log(`[SearchWorker] ✅ Задача успешно завершена ${jobDescription}`);
  } catch (error) {
    console.error(`[SearchWorker] ❌ Ошибка при обработке задачи ${jobDescription}`, error);
    // Выбрасываем ошибку снова, чтобы BullMQ мог обработать ее
    // (например, для повторной попытки, если настроено)
    throw error;
  }
};

// Привязываем обработчик к очереди
searchQueue.process(processSearchSyncJob);

console.log('[SearchWorker] 🚀 Обработчик очереди поиска запущен и готов к работе.');

export default searchQueue; 