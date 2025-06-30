import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../env/validation';

/**
 * Настроенный S3 клиент для работы с объектным хранилищем Рег.ру
 * Использует валидированные переменные окружения и правильную конфигурацию
 */
export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // Дополнительные настройки для стабильности
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 30000, // 30 секунд
  },
});

/**
 * Экспорт для использования в тестах и других модулях
 */
export { env as s3Config } from '../env/validation'; 