import sharp from 'sharp';
import type { VariantSpec } from './specs';

/**
 * Результат обработки одного варианта изображения
 */
export interface ProcessedVariant {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  size: number; // размер файла в байтах
}

/**
 * Инициализация Sharp с оптимальными настройками
 * Вызывается один раз при запуске приложения
 */
export function initializeSharp(concurrency: number = 2): void {
  sharp.concurrency(concurrency);
}

/**
 * Создает множественные варианты изображения из исходного файла
 * Использует параллельную обработку для оптимальной производительности
 * 
 * @param inputBuffer - Буфер исходного изображения
 * @param specs - Спецификации вариантов для создания
 * @returns Массив обработанных вариантов
 */
export async function makeVariants(
  inputBuffer: Buffer,
  specs: VariantSpec[]
): Promise<ProcessedVariant[]> {
  const originalImage = sharp(inputBuffer).rotate(); // Auto-orient по EXIF
  
  // Параллельная обработка всех вариантов
  const variants = await Promise.all(
    specs.map(async (spec) => {
      const { name, width, height, fit = 'contain' } = spec;
      
      // Настройки изменения размера
      const resizeOptions = height 
        ? { width, height, fit }
        : { width, fit, withoutEnlargement: true };

      // Настройки WebP в зависимости от варианта
      const webpOptions = {
        quality: 90,
        alphaQuality: 90,
        nearLossless: name === 'icon' || name === 'medium', // Улучшение для малых размеров
        effort: 4 // Баланс качество/скорость
      };

      // Обработка изображения
      const processed = originalImage
        .clone() // Обязательно для параллельной обработки
        .resize(resizeOptions)
        .webp(webpOptions);

      const buffer = await processed.toBuffer();
      const metadata = await processed.metadata();

      return {
        name,
        buffer,
        width: metadata.width || width,
        height: metadata.height || height || width,
        size: buffer.length
      };
    })
  );

  return variants;
}

/**
 * Валидирует и подготавливает файл для обработки
 * Проверяет формат, размер и другие ограничения
 * 
 * @param file - Файл изображения для валидации
 * @param maxSizeMB - Максимальный размер в мегабайтах
 * @returns Буфер для обработки
 */
export async function validateAndPrepareImage(
  file: File, 
  maxSizeMB: number
): Promise<Buffer> {
  // Проверка размера файла
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`Размер файла превышает ${maxSizeMB}MB`);
  }

  // Проверка MIME типа через RegExp (более надежно)
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
    throw new Error('Поддерживаются только JPEG, PNG и WebP форматы');
  }

  // Конвертация в буфер
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Дополнительная валидация через Sharp
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Не удается определить размеры изображения');
    }

    if (metadata.width < 32 || metadata.height < 32) {
      throw new Error('Изображение слишком маленькое (минимум 32x32px)');
    }

    if (metadata.width > 10000 || metadata.height > 10000) {
      throw new Error('Изображение слишком большое (максимум 10000x10000px)');
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Некорректный файл изображения: ${error.message}`);
    }
    throw new Error('Некорректный файл изображения');
  }

  return buffer;
} 