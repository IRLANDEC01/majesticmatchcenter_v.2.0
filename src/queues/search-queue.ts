import 'server-only';
import Bull from 'bull';

if (!process.env.REDIS_URL) {
  throw new Error('Переменная окружения REDIS_URL не установлена.');
}

// Создаем и экспортируем очередь.
// Имя 'search-sync' будет видно в UI для мониторинга.
const searchQueue = new Bull('search-sync', process.env.REDIS_URL);

// TODO: Добавить обработчик для этой очереди (worker)

export default searchQueue; 