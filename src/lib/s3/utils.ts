import { env } from '../env/validation';

/**
 * Формирует полный URL для S3 объекта
 * Использует публичный URL из переменных окружения
 * 
 * @param key - Ключ объекта в S3 (например: "maps/uuid/icon.webp")
 * @returns Полный URL для доступа к объекту
 */
export function getS3PublicUrl(key: string): string {
  return `${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${key}`;
}

/**
 * Создает srcSet строку для responsive изображений из объекта URLs
 * Используется в Next.js Image компонентах
 * 
 * @param imageUrls - Объект с URL для разных размеров
 * @returns srcSet строка для HTML
 */
export function createImageSrcSet(imageUrls: {
  icon: string;
  medium: string;
  original: string;
}): string {
  return [
    `${imageUrls.icon} 64w`,
    `${imageUrls.medium} 640w`,
    `${imageUrls.original} 1920w`
  ].join(', ');
}

/**
 * Универсальная функция для создания srcSet из массива URL
 * Полезна для динамических размеров или других сущностей
 * 
 * @param urls - Массив URL изображений
 * @param widths - Соответствующие ширины (по умолчанию стандартные)
 * @returns srcSet строка
 */
export function buildSrcSet(
  urls: string[], 
  widths: number[] = [64, 640, 1920]
): string {
  return urls
    .map((url, idx) => `${url} ${widths[idx]}w`)
    .join(', ');
}

/**
 * Создает sizes атрибут для responsive изображений
 * Покрывает основные breakpoints для мобильных и десктопных устройств
 * 
 * @param maxWidth - Максимальная ширина в пикселях (по умолчанию 640px)
 * @returns sizes строка для HTML
 */
export function createImageSizes(maxWidth: number = 640): string {
  return [
    '(max-width: 640px) 100vw',
    '(max-width: 1024px) 50vw',
    `${maxWidth}px`
  ].join(', ');
}

/**
 * Генерирует уникальный ключ для S3 объекта
 * Использует UUID для предотвращения коллизий
 * 
 * @param entityType - Тип сущности (maps, players, tournaments)
 * @param variant - Вариант изображения (icon, medium, original)
 * @param uuid - Уникальный идентификатор (генерируется автоматически если не передан)
 * @returns S3 ключ в формате "entityType/uuid/variant.webp"
 */
export function generateS3Key(
  entityType: string,
  variant: string,
  uuid?: string
): string {
  const id = uuid || crypto.randomUUID();
  return `${entityType}/${id}/${variant}.webp`;
}

/**
 * Создает объект с публичными URL для всех вариантов изображения
 * Удобно для передачи в компоненты
 * 
 * @param images - Объект с S3 ключами
 * @returns Объект с публичными URL
 */
export function toPublicUrls<T extends Record<string, string>>(images: T): T {
  const result = {} as T;
  
  for (const [variant, key] of Object.entries(images)) {
    (result as any)[variant] = getS3PublicUrl(key);
  }
  
  return result;
}

/**
 * Создает конфигурацию для Next.js Image с правильными sizes
 * 
 * @param images - Объект с S3 ключами изображений
 * @param defaultSize - Размер по умолчанию (обычно medium)
 * @returns Конфигурация для Next.js Image компонента
 */
export function createImageConfig(
  images: { icon: string; medium: string; original: string },
  defaultSize: 'icon' | 'medium' | 'original' = 'medium'
) {
  return {
    src: getS3PublicUrl(images[defaultSize]),
    srcSet: createImageSrcSet(images),
    sizes: createImageSizes(),
  };
} 