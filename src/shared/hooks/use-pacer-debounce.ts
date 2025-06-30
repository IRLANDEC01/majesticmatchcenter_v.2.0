import { useState, useEffect, useMemo, useRef } from 'react';
import { Debouncer } from '@tanstack/pacer';

// Константы интервалов (временная копия пока не работает path mapping)
const PACER_INTERVALS = {
  SEARCH: 300,
  SEARCH_FAST: 200,
  SEARCH_SLOW: 500,
  UI_EVENTS: 16,
  AUTOSAVE: 800,
  HEAVY_OPERATIONS: 1000,
} as const;

/**
 * Хук-замена для useDebounce из библиотеки use-debounce.
 * Использует TanStack Pacer под капотом для унификации debounce логики.
 * 
 * @param value - значение для debounce
 * @param delay - задержка в миллисекундах
 * @returns [debouncedValue, isPending] - debouncedValue и состояние ожидания
 */
export function usePacerDebounce<T>(
  value: T,
  delay: number = PACER_INTERVALS.SEARCH
): [T, boolean, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const valueRef = useRef<T>(value);
  
  // Создаем debouncer с указанной задержкой
  const debouncer = useMemo(() => {
    return new Debouncer((newValue: T) => {
      setDebouncedValue(newValue);
    }, { wait: delay });
  }, [delay]);

  // Получаем состояние pending из debouncer
  const isPending = debouncer.getIsPending();

  // Функция для отмены debounce
  const cancel = () => {
    debouncer.cancel();
  };

  useEffect(() => {
    // Обновляем reference на текущее значение
    valueRef.current = value;
    
    // Если значение изменилось, запускаем debounce
    if (value !== debouncedValue) {
      debouncer.maybeExecute(value);
    }
    
    // Cleanup функция для отмены pending debounce при размонтировании
    return () => {
      debouncer.cancel();
    };
  }, [value, debouncedValue, debouncer]);

  return [debouncedValue, isPending, cancel];
}

/**
 * Хук для создания debounced функции с контролем состояния.
 * Полезен для debounce API calls или других side effects.
 * 
 * @param callback - функция для debounce
 * @param delay - задержка в миллисекундах
 * @returns [debouncedCallback, isPending, cancel]
 */
export function usePacerDebouncedCallback<TArgs extends any[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  delay: number = PACER_INTERVALS.SEARCH
): [(...args: TArgs) => void, boolean, () => void] {
  
  const debouncer = useMemo(() => {
    return new Debouncer((...args: TArgs) => {
      return callback(...args);
    }, { wait: delay });
  }, [callback, delay]);

  const wrappedCallback = useMemo(() => {
    return (...args: TArgs) => {
      debouncer.maybeExecute(...args);
    };
  }, [debouncer]);

  const cancel = useMemo(() => {
    return () => {
      debouncer.cancel();
    };
  }, [debouncer]);

  const isPending = debouncer.getIsPending();

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return [wrappedCallback, isPending, cancel];
} 