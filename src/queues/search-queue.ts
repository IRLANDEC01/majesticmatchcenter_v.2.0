import 'server-only';
import { Queue } from 'bullmq';
import { getBackgroundRedisClient } from '../lib/redis-clients';

// Получаем "надежный" клиент для фоновых задач.
const redisClient = getBackgroundRedisClient();

// Создаем и экспортируем очередь, используя BullMQ.
// Имя 'search-sync' будет видно в UI для мониторинга.
const searchQueue = new Queue('search-sync', { 
  // BullMQ может переиспользовать существующий ioredis клиент.
  // Это предпочтительнее, чем создавать новое подключение.
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Попытаться выполнить задачу 3 раза в случае ошибки
    backoff: {
      type: 'exponential',
      delay: 1000, // 1с, 2с, 4с
    },
    removeOnComplete: true, // Автоматически удалять успешные задачи
    removeOnFail: 500, // Хранить 500 последних неудачных задач
  },
});

// TODO: Добавить обработчик для этой очереди (worker)

export default searchQueue; 