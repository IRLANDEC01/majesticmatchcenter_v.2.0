'use client';

import { useMemo } from 'react';
import type { AdminPermissions, AdminRole } from '@/shared/types/admin';

/**
 * Клиентский хук для получения прав доступа администратора
 * Принимает роль через props от серверного компонента
 */
export function usePermissions(adminRole: AdminRole): AdminPermissions {
  return useMemo(() => {
    // Маппинг ролей на права (дублируем логику из server-side для клиента)
    const rolePermissions = {
      super_admin: {
        canViewArchived: true,
        canArchive: true,
        canRestore: true,
        canManageUsers: true,
      },
      admin: {
        canViewArchived: false,
        canArchive: true,
        canRestore: false,
        canManageUsers: false,
      },
    };

    return rolePermissions[adminRole] || rolePermissions.admin;
  }, [adminRole]);
}

/**
 * Упрощенный хук для проверки конкретного разрешения
 */
export function useHasPermission(adminRole: AdminRole, permission: keyof AdminPermissions): boolean {
  const permissions = usePermissions(adminRole);
  return permissions[permission];
} 