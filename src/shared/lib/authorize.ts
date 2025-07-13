import { auth } from '@/../auth';
import { can, type Permission, type Role } from './permissions';

/**
 * Результат авторизации для API Routes
 */
export type AuthorizeResult = 
  | { success: true; user: { id: string; role: Role; isAdmin: boolean } }
  | { success: false; response: Response };

/**
 * HOF-гарда для Server Actions
 * Проверяет права доступа и оборачивает целевую функцию
 */
export function must(permission: Permission) {
  return function <T extends any[], R>(
    target: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const session = await auth();
      
      // Проверка аутентификации
      if (!session?.user?.isAdmin) {
        throw new Error('Доступ запрещен: требуется административная роль');
      }
      
      // Проверка права
      if (!can(session.user.role as Role, permission)) {
        throw new Error(`Доступ запрещен: требуется право "${permission}"`);
      }
      
      return target(...args);
    };
  };
}

/**
 * Гарда для API Routes
 * Возвращает объект с результатом авторизации
 */
export async function authorize(permission: Permission): Promise<AuthorizeResult> {
  try {
    const session = await auth();
    
    // Проверка аутентификации
    if (!session?.user?.isAdmin) {
      return {
        success: false,
        response: new Response(
          JSON.stringify({ error: 'Доступ запрещен: требуется административная роль' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    // Проверка права
    if (!can(session.user.role as Role, permission)) {
      return {
        success: false,
        response: new Response(
          JSON.stringify({ error: `Доступ запрещен: требуется право "${permission}"` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    return {
      success: true,
      user: {
        id: session.user.id,
        role: session.user.role as Role,
        isAdmin: session.user.isAdmin
      }
    };
  } catch (error) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Ошибка авторизации' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
} 