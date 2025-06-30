/**
 * @file Централизованный фасад для TanStack библиотек
 * @description Обеспечивает единую точку импорта всех TanStack утилит
 * @updated Январь 2025 - согласно официальной документации tanstack.com
 */

// =================================
// TanStack экспорты и конфигурации
// =================================

// Table
export { 
  useReactTable, 
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type Table,
} from '@tanstack/react-table';

// Virtual
export { 
  useVirtualizer,
  type VirtualItem,
  type Virtualizer,
} from '@tanstack/react-virtual';

// Pacer (debounce/throttle утилиты)
export { 
  debounce,
  asyncDebounce,
  throttle,
  asyncThrottle,
  queue,
  asyncQueue,
  rateLimit,
  asyncRateLimit,
  Debouncer,
  AsyncDebouncer,
  Throttler,
  AsyncThrottler,
} from '@tanstack/pacer';

// =================================
// Константы для консистентности
// =================================

/** 
 * Стандартная высота строки таблицы в пикселях.
 * ⚠️  ВАЖНО: TableHead = h-12 (48px), но TableCell = переменная высота!
 * Для виртуализации нужно установить фиксированную высоту строк.
 * 
 * Можно переопределить через NEXT_PUBLIC_TABLE_ROW_HEIGHT
 */
export const DEFAULT_ROW_HEIGHT_PX = Number(process.env.NEXT_PUBLIC_TABLE_ROW_HEIGHT ?? 64);

/** Количество дополнительных строк для рендера вне видимой области */
export const DEFAULT_OVERSCAN = 10;

// =================================
// Pacer конфигурации
// =================================

/** Стандартные интервалы для debounce/throttle операций (в миллисекундах) */
export const PACER_INTERVALS = {
  /** Поиск в реальном времени */
  SEARCH: 300,
  /** Быстрый поиск (autocomplete) */
  SEARCH_FAST: 200, 
  /** Медленный поиск (full-text, агрегации) */
  SEARCH_SLOW: 500,
  /** UI события (скролл, resize) ~60 FPS */
  UI_EVENTS: 16,
  /** Автосохранение форм */
  AUTOSAVE: 800,
  /** Тяжелые операции */
  HEAVY_OPERATIONS: 1000,
} as const;

/** Типизированные ключи интервалов для автокомплита и type safety */
export type PacerIntervalKey = keyof typeof PACER_INTERVALS;

// =================================
// Virtualization конфигурации
// =================================

/** Пороги включения виртуализации для разных сущностей */
export const VIRTUAL_THRESHOLDS = {
  /** Map Templates - включать виртуализацию при >100 записей */
  MAP_TEMPLATES: 100,
  /** Players - включать при >150 записей (более простые строки) */
  PLAYERS: 150,
  /** Tournaments - включать при >75 записей (сложные строки с изображениями) */
  TOURNAMENTS: 75,
  /** Публичные рейтинги - всегда включать (могут быть очень длинные) */
  PUBLIC_RATINGS: 25,
} as const;

/** Высота строк с учетом изображений (запас для избежания "дергания") */
export const ROW_HEIGHTS = {
  /** Стандартная строка без изображений */
  STANDARD: DEFAULT_ROW_HEIGHT_PX,
  /** Строка с изображениями (с запасом для next/image) */
  WITH_IMAGES: DEFAULT_ROW_HEIGHT_PX + 8,
} as const; 