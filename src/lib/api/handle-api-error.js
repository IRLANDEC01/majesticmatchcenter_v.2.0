import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DuplicateError, ValidationError, NotFoundError, AppError } from '@/lib/errors';

// Карта обработчиков ошибок, где ключ - конструктор ошибки, а значение - функция-обработчик.
const errorHandlers = new Map([
  [ZodError, (error) => NextResponse.json({ errors: error.flatten().fieldErrors }, { status: 400 })],
  [ValidationError, (error) => NextResponse.json({ message: error.message, errors: error.details }, { status: 400 })],
  [NotFoundError, (error) => NextResponse.json({ message: error.message }, { status: 404 })],
  [DuplicateError, (error) => NextResponse.json({ message: error.message }, { status: 409 })],
  [AppError, (error) => NextResponse.json({ message: error.message }, { status: error.statusCode })],
]);

/**
 * Централизованный обработчик ошибок для API маршрутов.
 * Итерируется по карте обработчиков и использует `instanceof` для надежного определения типа ошибки.
 * @param {Error} error - Объект ошибки.
 * @param {string} [context='An unexpected error occurred'] - Контекстное сообщение для лога.
 * @returns {NextResponse} - Стандартизированный ответ с ошибкой.
 */
export function handleApiError(error, context = 'An unexpected error occurred') {
  // Логируем ошибку для отладки. В тестовой среде выводим полный объект ошибки.
  if (process.env.NODE_ENV === 'test') {
    console.error('TEST_ERROR_DETAIL:', error);
  } else {
    console.error(`${context}:`, error);
  }

  for (const [ErrorClass, handler] of errorHandlers.entries()) {
    if (error instanceof ErrorClass) {
      return handler(error);
    }
  }

  // Для всех остальных непредвиденных ошибок
  return NextResponse.json({ message: 'Внутренняя ошибка сервера' }, { status: 500 });
}