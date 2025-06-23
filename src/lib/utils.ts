import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Утилитарная функция для условного объединения имен классов Tailwind.
 * @param {...ClassValue} inputs - Последовательность значений классов (строки, объекты, массивы).
 * @returns {string} - Итоговая строка с объединенными классами.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}