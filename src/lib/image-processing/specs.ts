/**
 * Поддерживаемые типы сущностей для обработки изображений
 */
export type EntityType = 'maps' | 'map-template' | 'players' | 'tournaments';

/**
 * Спецификация одного варианта изображения
 */
export interface VariantSpec {
  name: string;           // Название варианта (icon, medium, original)
  width: number;          // Ширина в пикселях
  height?: number;        // Высота (опционально, сохраняет пропорции если не указана)
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'; // Стратегия изменения размера
}

/**
 * Конфигурации размеров для разных типов сущностей
 * Каждая сущность может иметь свои оптимальные размеры
 */
const ENTITY_SPECS: Record<EntityType, VariantSpec[]> = {
  maps: [
    { name: 'icon', width: 64, height: 64, fit: 'cover' },      // Квадратная иконка для списков
    { name: 'medium', width: 640, fit: 'contain' },             // Средний размер для карточек
    { name: 'original', width: 1920, fit: 'contain' },          // Полный размер для детального просмотра
  ],
  
  'map-template': [
    { name: 'icon', width: 64, height: 36, fit: 'cover' },      // Иконка 16:9 для списков
    { name: 'medium', width: 640, fit: 'contain' },             // Средний размер для карточек и форм
    { name: 'original', width: 1920, fit: 'contain' },          // Полный размер для детального просмотра
  ],
  
  players: [
    { name: 'icon', width: 64, height: 64, fit: 'cover' },      // Аватар в чатах и списках
    { name: 'medium', width: 320, height: 320, fit: 'cover' },  // Профильная картинка
    { name: 'original', width: 1024, fit: 'contain' },          // Полный размер аватара
  ],
  
  tournaments: [
    { name: 'icon', width: 64, height: 64, fit: 'cover' },      // Логотип турнира
    { name: 'medium', width: 640, height: 360, fit: 'cover' },  // Баннер 16:9
    { name: 'original', width: 1920, height: 1080, fit: 'cover' }, // Полноразмерный баннер
  ],
};

/**
 * Получает спецификации вариантов для указанного типа сущности
 * 
 * @param entityType - Тип сущности
 * @returns Массив спецификаций вариантов
 * @throws Error если тип сущности не поддерживается
 */
export function getVariantSpecs(entityType: string): VariantSpec[] {
  if (!isValidEntityType(entityType)) {
    throw new Error(`Неподдерживаемый тип сущности: ${entityType}`);
  }
  
  return ENTITY_SPECS[entityType];
}

/**
 * Проверяет, является ли строка валидным типом сущности
 * 
 * @param entityType - Строка для проверки
 * @returns true если тип поддерживается
 */
export function isValidEntityType(entityType: string): entityType is EntityType {
  return entityType in ENTITY_SPECS;
}

/**
 * Получает список всех поддерживаемых типов сущностей
 * 
 * @returns Массив названий типов сущностей
 */
export function getSupportedEntityTypes(): EntityType[] {
  return Object.keys(ENTITY_SPECS) as EntityType[];
} 