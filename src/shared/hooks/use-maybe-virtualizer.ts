import { useRef, RefObject } from 'react';
import { 
  useVirtualizer, 
  VIRTUAL_THRESHOLDS, 
  ROW_HEIGHTS,
  DEFAULT_OVERSCAN
} from '@/shared/tanstack';

/**
 * Универсальный хук для условной виртуализации любых таблиц
 * 
 * @description Автоматически включает виртуализацию при превышении threshold.
 * Работает с любыми данными (MapTemplate, Player, Tournament, Family, etc.)
 * 
 * @example
 * // Любая таблица
 * const { enableVirtual, virtualizer } = useMaybeVirtualizer(players, tableRef);
 * const { enableVirtual, virtualizer } = useMaybeVirtualizer(tournaments, tableRef, 50);
 * const { enableVirtual, virtualizer } = useMaybeVirtualizer(families, tableRef);
 */

export interface VirtualizerConfig {
  /** Порог активации виртуализации (по умолчанию 100) */
  threshold?: number;
  /** Высота одной строки в пикселях (по умолчанию 48) */
  estimateSize?: number;
  /** Количество буферных строк для плавности (по умолчанию 10) */
  overscan?: number;
  /** Отключить виртуализацию принудительно */
  disabled?: boolean;
}

export interface VirtualizerResult {
  /** Нужно ли включать виртуализацию */
  enableVirtual: boolean;
  /** Виртуализатор (null если виртуализация выключена) */
  virtualizer: ReturnType<typeof useVirtualizer> | null;
  /** Информация для отладки */
  debugInfo: string;
  /** Ref для контейнера скролла */
  containerRef: RefObject<Element | null>;
}

export function useMaybeVirtualizer<T = any>(
  rows: T[], 
  config: VirtualizerConfig = {}
): VirtualizerResult {
  const {
    threshold = VIRTUAL_THRESHOLDS.MAP_TEMPLATES,  // ⚡ Используем централизованные константы
    estimateSize = ROW_HEIGHTS.STANDARD,
    overscan = DEFAULT_OVERSCAN,
    disabled = false
  } = config;

  // ✅ Создаем ref автоматически для удобства
  const containerRef = useRef<Element>(null);

  // ✅ Логика включения виртуализации
  const enableVirtual = !disabled && rows.length > threshold;

  // ✅ Создаем виртуализатор только если нужно
  const virtualizer = useVirtualizer({
    count: enableVirtual ? rows.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateSize,
    overscan,
    // ✅ Отключаем если не нужно (избегаем лишних вычислений)
    enabled: enableVirtual,
  });

  return {
    enableVirtual,
    virtualizer: enableVirtual ? virtualizer : null,
    debugInfo: `${rows.length} rows (virtual: ${enableVirtual ? 'ON' : 'OFF'}, threshold: ${threshold})`,
    containerRef,
  };
}

// ✅ Предустановленные конфигурации для разных случаев (используют централизованные константы)
export const VirtualizerPresets = {
  /** Map Templates (стандартные админ таблицы) */
  mapTemplates: { 
    threshold: VIRTUAL_THRESHOLDS.MAP_TEMPLATES, 
    estimateSize: ROW_HEIGHTS.STANDARD, 
    overscan: DEFAULT_OVERSCAN 
  },
  
  /** Players (простые строки - можно больший порог) */
  players: { 
    threshold: VIRTUAL_THRESHOLDS.PLAYERS, 
    estimateSize: ROW_HEIGHTS.STANDARD, 
    overscan: DEFAULT_OVERSCAN 
  },
  
  /** Tournaments (сложные строки с изображениями) */
  tournaments: { 
    threshold: VIRTUAL_THRESHOLDS.TOURNAMENTS, 
    estimateSize: ROW_HEIGHTS.WITH_IMAGES, 
    overscan: DEFAULT_OVERSCAN 
  },
  
  /** Публичные рейтинги (может быть много данных) */
  publicRatings: { 
    threshold: VIRTUAL_THRESHOLDS.PUBLIC_RATINGS, 
    estimateSize: ROW_HEIGHTS.STANDARD, 
    overscan: DEFAULT_OVERSCAN + 5 
  },
  
  /** Стандартные админ таблицы (универсальный) */
  admin: { 
    threshold: VIRTUAL_THRESHOLDS.MAP_TEMPLATES, 
    estimateSize: ROW_HEIGHTS.STANDARD, 
    overscan: DEFAULT_OVERSCAN 
  },
  
  /** Таблицы с изображениями (тяжелые строки) */
  withImages: { 
    threshold: VIRTUAL_THRESHOLDS.TOURNAMENTS, 
    estimateSize: ROW_HEIGHTS.WITH_IMAGES, 
    overscan: DEFAULT_OVERSCAN - 5 
  },
  
  /** Всегда включенная виртуализация */
  always: { threshold: 1, estimateSize: ROW_HEIGHTS.STANDARD, overscan: DEFAULT_OVERSCAN },
  
  /** Всегда выключенная виртуализация */
  never: { disabled: true },
} as const;

/**
 * Хуки для конкретных типов таблиц с предустановками
 */
export function useMapTemplatesVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.mapTemplates);
}

export function usePlayersVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.players);
}

export function useTournamentsVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.tournaments);
}

export function usePublicRatingsVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.publicRatings);
}

export function useAdminTableVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.admin);
}

export function useImageTableVirtualizer<T>(rows: T[]) {
  return useMaybeVirtualizer(rows, VirtualizerPresets.withImages);
} 