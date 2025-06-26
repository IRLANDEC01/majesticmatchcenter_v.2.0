import { Worker, Job } from 'bullmq';
import searchService from '../lib/domain/search/search-service';
import { getBackgroundRedisClient } from '../lib/redis-clients';

// Явный импорт моделей для их регистрации в Mongoose в процессе воркера
import '../models/map/MapTemplate';
import '../models/tournament/TournamentTemplate';
import '../models/player/Player';
import '../models/family/Family';

// Определяем интерфейс для данных задачи, чтобы обеспечить типизацию
interface SearchSyncJobData {
  entity: string;
  entityId: string;
}

const redisClient = getBackgroundRedisClient();

/**
 * Обработчик задач для очереди 'search-sync'.
 * Эта функция вызывается для каждой задачи, поступающей в очередь.
 */
const processSearchSyncJob = async (job: Job<SearchSyncJobData>) => {
  // Теперь у нас есть только действие 'update' (или 'delete' в будущем)
  const { entity, entityId } = job.data;
  const action = job.name as 'update' | 'delete';
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


const worker = new Worker('search-sync', processSearchSyncJob, { 
  connection: redisClient,
  concurrency: 5, // Обрабатывать до 5 задач одновременно
});

worker.on('completed', job => {
  console.log(`[SearchWorker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`[SearchWorker] Job ${job?.id} has failed with ${err.message}`);
});


console.log('[SearchWorker] 🚀 Обработчик очереди поиска запущен и готов к работе.');

export default worker; 