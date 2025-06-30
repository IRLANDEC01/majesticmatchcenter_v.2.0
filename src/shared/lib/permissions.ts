import 'server-only';
import type { AdminRole, Permission, AdminPermissions } from '@/shared/types/admin';

/**
 * Маппинг ролей на права доступа
 * В будущем это может быть вынесено в конфигурационный файл или БД
 */
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ['viewArchived', 'archive', 'restore', 'manageUsers'],
  admin: ['archive'], // Обычный админ может только архивировать, но не видеть архив
};

/**
 * Получает текущую роль администратора из переменных среды
 * ВРЕМЕННО: После внедрения авторизации будет читать из сессии
 */
export function getCurrentAdminRole(): AdminRole {
  const role = process.env.ADMIN_ROLE as AdminRole;
  
  if (!role || !ROLE_PERMISSIONS[role]) {
    console.warn(`Invalid ADMIN_ROLE: ${role}. Defaulting to 'admin'`);
    return 'admin';
  }
  
  return role;
}

/**
 * Алиас для getCurrentAdminRole для обратной совместимости
 */
export const getAdminRole = getCurrentAdminRole;

/**
 * Получает список разрешений для текущего администратора
 * ВРЕМЕННО: После внедрения авторизации будет читать из сессии
 */
export function getAdminPermissions(): Permission[] {
  const role = getCurrentAdminRole();
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Проверяет, есть ли у текущего администратора конкретное разрешение
 */
export function hasPermission(permission: Permission): boolean {
  const permissions = getAdminPermissions();
  return permissions.includes(permission);
}

/**
 * Возвращает объект с булевыми флагами для удобной проверки в компонентах
 */
export function getPermissionFlags(): AdminPermissions {
  const permissions = getAdminPermissions();
  
  return {
    canViewArchived: permissions.includes('viewArchived'),
    canArchive: permissions.includes('archive'),
    canRestore: permissions.includes('restore'),
    canManageUsers: permissions.includes('manageUsers'),
  };
}

/**
 * Проверяет, может ли администратор работать с указанным статусом сущности
 */
export function canAccessEntityStatus(status: 'active' | 'archived' | 'all'): boolean {
  if (status === 'active') {
    return true; // Все могут видеть активные сущности
  }
  
  if (status === 'archived' || status === 'all') {
    return hasPermission('viewArchived');
  }
  
  return false;
} 