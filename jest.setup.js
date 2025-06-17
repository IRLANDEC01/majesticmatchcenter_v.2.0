// jest.setup.js
import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '@/lib/db.js';
import '@/models/index.js'; // Важнейший импорт для регистрации всех моделей!

// Увеличиваем таймаут для всех тестов
jest.setTimeout(30000);

// Подключаемся к базе данных один раз перед всеми тестами в файле
beforeAll(async () => {
  await connectToDatabase();
});

// Очищаем все коллекции перед каждым тестом (`it`) для обеспечения изоляции
beforeEach(async () => {
  const { collections } = mongoose.connection;
  
  const promises = Object.keys(collections).map(key => 
    collections[key].deleteMany({})
  );
  
  await Promise.all(promises);
});

// Отключаемся от базы данных после всех тестов в файле
afterAll(async () => {
  await disconnectFromDatabase();
});

// Устанавливаем фиктивную переменную окружения для тестов.
// Это необходимо, чтобы пройти проверку в src/lib/redis.js,
// даже несмотря на то, что сам Redis мокается.
process.env.REDIS_URL = 'redis://mock-redis:6379';

// Это глобальная настройка для всех тестов.
// Мы используем jest.mock для того, чтобы перехватить все запросы к модулю 'ioredis'
// и подменить его на 'ioredis-mock'.
// Это позволяет нам изолировать тесты от реальной инфраструктуры Redis.
jest.mock('ioredis', () => require('ioredis-mock')); 