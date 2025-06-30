import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './client';
import { env } from '../env/validation';
import { makeVariants, validateAndPrepareImage } from '../image-processing/variants';
import { getVariantSpecs } from '../image-processing/specs';
import { getS3PublicUrl, generateS3Key } from './utils';
import { IMAGE_UPLOAD_CONFIG } from '@/lib/constants';

/**
 * Результат загрузки изображения в S3
 */
export interface UploadResult {
  /** S3 ключи для каждого варианта */
  keys: Record<string, string>;
  /** Публичные URL для каждого варианта */
  urls: Record<string, string>;
  /** Метаданные загруженных файлов */
  metadata: {
    originalSize: number;
    variants: Array<{
      name: string;
      size: number;
      width: number;
      height: number;
    }>;
  };
}

/**
 * Загружает изображение в S3 с созданием множественных вариантов
 * Обеспечивает атомарность операции с rollback при ошибках
 * 
 * @param file - Файл изображения для загрузки
 * @param entityType - Тип сущности (maps, players, tournaments)
 * @param entityId - Опциональный ID сущности для переиспользования UUID
 * @returns Результат загрузки с ключами и URL
 */
export async function uploadImageVariants(
  file: File,
  entityType: string,
  entityId?: string
): Promise<UploadResult> {
  // Валидация и подготовка файла
  const inputBuffer = await validateAndPrepareImage(file, IMAGE_UPLOAD_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024);
  
  // Получение спецификаций для типа сущности
  const specs = getVariantSpecs(entityType);
  
  // Создание вариантов изображения
  const variants = await makeVariants(inputBuffer, specs);
  
  // Генерация уникального UUID для всех вариантов
  const baseUuid = entityId || crypto.randomUUID();
  
  // Подготовка данных для загрузки
  const uploadTasks = variants.map(variant => ({
    variant,
    key: generateS3Key(entityType, variant.name, baseUuid),
  }));
  
  const uploadedKeys: string[] = [];
  
  try {
    // Параллельная загрузка всех вариантов
    await Promise.all(
      uploadTasks.map(async ({ variant, key }) => {
        const command = new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: variant.buffer,
          ContentType: 'image/webp',
          ACL: 'public-read',
          Metadata: {
            variant: variant.name,
            entityType,
            originalName: file.name,
            width: variant.width.toString(),
            height: variant.height.toString(),
          },
        });
        
        await s3Client.send(command);
        uploadedKeys.push(key);
      })
    );
    
    // Формирование результата
    const keys: Record<string, string> = {};
    const urls: Record<string, string> = {};
    
    uploadTasks.forEach(({ variant, key }) => {
      keys[variant.name] = key;
      urls[variant.name] = getS3PublicUrl(key);
    });
    
    return {
      keys,
      urls,
      metadata: {
        originalSize: file.size,
        variants: variants.map(v => ({
          name: v.name,
          size: v.size,
          width: v.width,
          height: v.height,
        })),
      },
    };
    
  } catch (error) {
    // Rollback: удаление всех загруженных файлов
    if (uploadedKeys.length > 0) {
      await Promise.allSettled(
        uploadedKeys.map(key =>
          s3Client.send(new DeleteObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
          }))
        )
      );
    }
    
    throw new Error(
      `Ошибка загрузки изображения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    );
  }
}

/**
 * Удаляет все варианты изображения из S3
 * Используется при архивации или удалении сущности
 * 
 * @param keys - Массив S3 ключей для удаления
 * @returns Promise который разрешается после удаления всех файлов
 */
export async function deleteImageVariants(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  
  try {
    await Promise.all(
      keys.map(key =>
        s3Client.send(new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
        }))
      )
    );
  } catch (error) {
    // Логируем ошибку, но не прерываем операцию
    // В продакшене здесь должен быть proper логгер
    console.error('Ошибка удаления изображений из S3:', error);
  }
} 