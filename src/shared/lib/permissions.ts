/* ---------- Единый источник правды: список всех прав ---------- */
export const PERMISSIONS = [
  'viewArchived',
  'unarchive',
  'viewAudit',
  'manageEntities',
  'manageNews',
  // ...добавляйте новые здесь
] as const;
export type Permission = typeof PERMISSIONS[number];

/* ---------- Роли ---------- */
export type Role = 'super' | 'admin' | 'moderator';

/* ---------- Автоматическая матрица из правил для ролей ---------- */
function makeMatrix(
  roleRules: Partial<Record<Role, Partial<Record<Permission, boolean>>>>
): Record<Role, Record<Permission, boolean>> {
  const matrix = {} as Record<Role, Record<Permission, boolean>>;
  
  const roles: Role[] = ['super', 'admin', 'moderator'];
  
  for (const role of roles) {
    matrix[role] = {} as Record<Permission, boolean>;
    for (const permission of PERMISSIONS) {
      // По умолчанию false, если не указано явно
      matrix[role][permission] = roleRules[role]?.[permission] ?? false;
    }
  }
  
  return matrix;
}

/* ---------- Конфигурация ролей (только true права, false автоматически) ---------- */
export const ROLE_MATRIX = makeMatrix({
  super: { 
    viewArchived: true, 
    unarchive: true, 
    viewAudit: true, 
    manageEntities: true,
    manageNews: true
  },
  admin: { 
    manageEntities: true,
    manageNews: true
  },
  moderator: { 
    manageNews: true 
  },
});

/* ---------- ✅ ИСПРАВЛЕНО: Быстрая проверка прав с поддержкой undefined (O(1) доступ) ---------- */
export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_MATRIX[role]?.[permission] ?? false;
}

/* ---------- ✅ ИСПРАВЛЕНО: Утилиты для множественных проверок с поддержкой undefined ---------- */
export function hasAllPermissions(role: Role | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(perm => can(role, perm));
}

export function hasAnyPermission(role: Role | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(perm => can(role, perm));
}

/**
 * ✅ ИСПРАВЛЕНО: Возвращает все разрешения для роли с поддержкой undefined
 */
export function getPermissionsForRole(role: Role | undefined): Permission[] {
  if (!role) return [];
  return PERMISSIONS.filter(permission => can(role, permission));
}

/**
 * ✅ ИСПРАВЛЕНО: Проверяет, может ли роль работать с указанным статусом сущности
 */
export function canAccessEntityStatus(role: Role | undefined, status: 'active' | 'archived' | 'all'): boolean {
  if (status === 'active') {
    return true; // Все могут видеть активные сущности
  }
  
  if (status === 'archived' || status === 'all') {
    return can(role, 'viewArchived');
  }
  
  return false;
} 