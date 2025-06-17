/**
 * Базовый класс для всех кастомных ошибок приложения.
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка, выбрасываемая при попытке создать дублирующуюся запись.
 * Соответствует HTTP статусу 409 Conflict.
 */
export class DuplicateError extends AppError {
  constructor(message = 'A duplicate record already exists.') {
    super(message, 409);
  }
}

/**
 * Ошибка, выбрасываемая, когда сущность не найдена.
 * Соответствует HTTP статусу 404 Not Found.
 */
export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 404);
  }
}

/**
 * Ошибка, выбрасываемая при невалидных входных данных.
 * Соответствует HTTP статусу 400 Bad Request.
 */
export class ValidationError extends AppError {
  constructor(message = 'Invalid input data.', errors) {
    super(message, 400);
    this.errors = errors; // Может содержать массив конкретных ошибок полей
  }
} 