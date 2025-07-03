/**
 * Список ключевых слов, указывающих на ошибку авторизации.
 */
const AUTH_ERROR_KEYWORDS = [
  'NEXT_AUTH_SESSION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'ACCESS DENIED',
  'AUTHENTICATION',
  'SESSION'
];

/**
 * Проверяет, является ли переданная ошибка связанной с авторизацией.
 * Ошибка определяется как "авторизационная", если ее сообщение содержит
 * одно из ключевых слов.
 * 
 * @param {unknown} error - Перехваченная ошибка.
 * @returns {boolean} - true, если ошибка связана с авторизацией.
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const errorMessage = error.message.toUpperCase();
    return AUTH_ERROR_KEYWORDS.some(keyword => errorMessage.includes(keyword));
  }
  return false;
} 