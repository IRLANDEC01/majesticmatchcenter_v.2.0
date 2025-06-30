import { z } from 'zod';

/**
 * Схема валидации переменных окружения для S3 и обработки изображений
 * Обеспечивает типобезопасность и раннее обнаружение ошибок конфигурации
 */
const envSchema = z.object({
  // S3 Configuration
  S3_ENDPOINT: z.string().min(1, 'S3_ENDPOINT обязателен'),
  S3_BUCKET: z.string().min(1, 'S3_BUCKET обязателен'),
  S3_REGION: z.string().min(1, 'S3_REGION обязателен'),
  S3_FORCE_PATH_STYLE: z
    .preprocess(v => v === 'true' || v === true, z.boolean())
    .default(true),
  S3_ACCESS_KEY_ID: z.string().min(1, 'S3_ACCESS_KEY_ID обязателен'),
  S3_SECRET_ACCESS_KEY: z.string().min(1, 'S3_SECRET_ACCESS_KEY обязателен'),
  
  // Public URL для формирования ссылок на изображения
  NEXT_PUBLIC_S3_PUBLIC_URL: z.string().url('NEXT_PUBLIC_S3_PUBLIC_URL должен быть валидным URL'),
});

/**
 * Валидированные переменные окружения
 * Используется во всех S3 и image processing модулях
 */
export const env = envSchema.parse(process.env);

/**
 * Типы для переменных окружения
 */
export type EnvConfig = z.infer<typeof envSchema>; 