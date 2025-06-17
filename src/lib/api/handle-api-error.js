import { NextResponse } from 'next/server';
import { logger } from '../utils/logger';

/**
 * Централизованный обработчик ошибок для API маршрутов.
 * Анализирует тип ошибки и возвращает стандартизированный JSON ответ
 * с соответствующим HTTP статусом.
 *
 * @param {Error} error - Перехваченный объект ошибки.
 * @returns {NextResponse} - Стандартизированный ответ об ошибке.
 */
export function handleApiError(error) {
  // Логируем ошибку для отладки
  console.error(error);

  // Ошибка валидации Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => e.message);
    return NextResponse.json(
      { message: 'Ошибка валидации', errors },
      { status: 400 }
    );
  }

  // Ошибка дублирующегося ключа MongoDB
  if (error.code === 11000) {
    return NextResponse.json(
      { message: 'Запись с таким уникальным полем уже существует.' },
      { status: 409 }
    );
  }

  // Кастомная ошибка API (если мы ее определим в будущем)
  if (error.isApiError) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode });
  }

  // Непредвиденная серверная ошибка
  return NextResponse.json(
    { message: 'Внутренняя ошибка сервера.' },
    { status: 500 }
  );
} 