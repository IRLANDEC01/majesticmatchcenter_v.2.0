/**
 * Типы для системы администрирования и разграничения прав доступа
 */

/** Роли администраторов */
export type AdminRole = 'super_admin' | 'admin';

/** Права доступа в системе */
export type Permission = 
  | 'viewArchived'    // Просмотр архивных сущностей
  | 'archive'         // Архивация активных сущностей  
  | 'restore'         // Восстановление архивных сущностей
  | 'manageUsers';    // Управление пользователями (будущее)

/** Статус сущности для фильтрации */
export type EntityStatus = 'active' | 'archived' | 'all';

/** Статус сущности для фильтрации с поддержкой пустого состояния */
export type EntityStatusOptional = EntityStatus | undefined;

/** Интерфейс для проверки прав доступа */
export interface AdminPermissions {
  canViewArchived: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canManageUsers: boolean;
}

/** Тип для состояния Server Actions */
export type FormActionState = {
  success: boolean;
  errors: Record<string, string>;
  error?: string;
}; 