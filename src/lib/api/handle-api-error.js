import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DuplicateError, NotFoundError, ValidationError, AppError } from '@/lib/errors';

/**
 * Централизованный обработчик ошибок для API маршрутов.
 * @param {Error} error - Перехваченная ошибка.
 * @returns {NextResponse} - Стандартизированный ответ с ошибкой.
 */
export function handleApiError(error) {
  // Логируем ошибку для отладки
  console.error(error);

  // Кастомные ошибки приложения
  if (error instanceof AppError) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode });
  }

  // Ошибка валидации Zod
  if (error instanceof ZodError) {
    return NextResponse.json(
      { message: 'Validation failed', errors: error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  
  // Ошибка валидации Mongoose
  if (error.name === 'ValidationError') {
    return NextResponse.json(
      { message: error.message || 'Validation Error', errors: error.errors },
      { status: 400 }
    );
  }

  // Ошибка дублирования ключа Mongoose (E11000)
  if (error.code === 11000) {
    return NextResponse.json(
      { message: 'A record with this key already exists.' },
      { status: 409 }
    );
  }
  
  // Неизвестная ошибка
  return NextResponse.json(
    { message: 'An unexpected error occurred on the server.' },
    { status: 500 }
  );
} 