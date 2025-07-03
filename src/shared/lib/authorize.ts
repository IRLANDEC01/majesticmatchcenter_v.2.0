import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { can, Permission, Role } from '@/shared/lib/permissions';

/**
 * Результат авторизации (успешный)
 */
export interface AuthorizeSuccess {
  adminId: string;
  role: Role;
}

/**
 * ✅ ИСПРАВЛЕНО: Упрощенная типизация результата авторизации
 * Возвращаем либо успешный объект, либо NextResponse напрямую
 */
export type AuthorizeResult = AuthorizeSuccess | NextResponse;

/**
 * Серверный guard для проверки прав доступа в API routes
 * 
 * @param request - NextRequest объект
 * @param permission - одно право или массив прав для проверки
 * @returns объект с adminId и role при успехе, NextResponse с ошибкой при отказе
 * 
 * @example
 * ```typescript
 * // Проверка результата
 * const authCheck = await authorize(request, 'manageEntities');
 * if (authCheck instanceof NextResponse) return authCheck;
 * 
 * // Множественные права
 * const authCheck = await authorize(request, ['viewArchived', 'unarchive']);
 * if (authCheck instanceof NextResponse) return authCheck;
 * ```
 */
export async function authorize(
  request: NextRequest, 
  permission: Permission | Permission[]
): Promise<AuthorizeResult> {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { role, adminId, isAdmin } = session.user as { role?: Role; adminId?: string; isAdmin?: boolean };
  
  // ✅ ИСПРАВЛЕНО: Проверяем что пользователь администратор и есть роль
  if (!isAdmin || !role || !adminId) {
    return NextResponse.json(
      { error: 'Access denied. Admin privileges required.' },
      { status: 403 }
    );
  }
  
  // Проверяем права: одно или массив
  const hasPermission = Array.isArray(permission)
    ? permission.every((perm) => can(role, perm))
    : can(role, permission);
  
  if (!hasPermission) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  return { adminId, role };
}

/**
 * ✅ ИСПРАВЛЕНО: Упрощенный type guard для проверки ошибки
 */
export function isAuthError(result: AuthorizeResult): result is NextResponse {
  return result instanceof NextResponse;
} 