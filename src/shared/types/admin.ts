/**
 * Типы для системы администрирования и разграничения прав доступа
 */

/** Статус сущности для фильтрации */
export type EntityStatus = 'active' | 'archived' | 'all';

/** Статус сущности для фильтрации с поддержкой пустого состояния */
export type EntityStatusOptional = EntityStatus | undefined;

/** Интерфейс для проверки прав доступа (согласно предложению ассистента) */
export interface AdminPermissions {
  canViewArchived: boolean;
  canUnarchive: boolean;
  canViewAudit: boolean;
  canManageEntities: boolean;
  canManageNews: boolean;
}

/** Тип для состояния Server Actions */
export type FormActionState = {
  success: boolean;
  errors: Record<string, string>;
  error?: string;
}; 