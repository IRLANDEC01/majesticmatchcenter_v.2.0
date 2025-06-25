import mongoose from 'mongoose';
import '@/queues/search-worker';
import searchService from './domain/search/search-service';

// Используем глобальную переменную для кэширования соединения
// Это предотвращает многократные подключения в средах без сервера (serverless)
let cachedConnection = null;

export async function connectToDatabase() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // jest-mongodb-preset предоставляет MONGO_URL. Для локальной разработки/продакшена используем MONGODB_URI.
  const MONGODB_URI = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGO_URL or MONGODB_URI environment variable');
  }

  // Создаем уникальное имя БД для каждого воркера Jest для полной изоляции.
  const connectOptions = {};
  if (process.env.JEST_WORKER_ID) {
    connectOptions.dbName = `test_${process.env.JEST_WORKER_ID}`;
  }

  mongoose.set('strictQuery', true);
  cachedConnection = await mongoose.connect(MONGODB_URI, connectOptions);
  
  // Инициализируем сервис MeiliSearch после успешного подключения к БД.
  // Мы не ждем (await), чтобы не блокировать старт приложения.
  // Инициализация будет проходить в фоне.
  if (process.env.NODE_ENV !== 'test') {
    searchService.init().catch(err => {
      console.error("Фоновая инициализация MeiliSearch провалилась.", err);
    });
  }

  return cachedConnection;
}

export async function clearDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('clearDatabase should only be called in test environment');
    return;
  }
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

export async function disconnectFromDatabase() {
  if (cachedConnection) {
    await mongoose.connection.close();
    cachedConnection = null;
  }
} 