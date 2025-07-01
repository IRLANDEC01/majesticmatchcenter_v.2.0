import mongoose, { Schema } from 'mongoose';

/**
 * @typedef {object} AuditLog
 * @property {mongoose.Types.ObjectId} adminId - ID администратора, совершившего действие.
 * @property {string} entity - Тип сущности (например, 'MapTemplate', 'AdminUser').
 * @property {mongoose.Types.ObjectId} entityId - ID конкретного документа.
 * @property {('create'|'update'|'archive'|'restore'|'delete'|'complete'|'rollback'|'owner_change'|'role_change'|'login'|'permission_grant'|'permission_revoke'|'ban'|'unban')} action - Тип действия.
 * @property {object} [changes] - Объект, описывающий изменения.
 * @property {string} [context] - Дополнительный контекст (например, 'system_job', 'auth_system').
 * @property {string} [ipAddress] - IP адрес администратора (для административных действий).
 * @property {string} [userAgent] - User-Agent браузера (для безопасности).
 * @property {Date} timestamp - Временная метка события.
 */

const auditLogSchema = new Schema({
  // ID администратора, который совершил действие
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true,
    index: true,
    comment: 'ID администратора, совершившего действие',
  },
  // Тип сущности, над которой было совершено действие
  entity: {
    type: String,
    required: true,
    index: true,
    comment: 'Тип сущности, над которой совершено действие (например, MapTemplate)',
  },
  // ID конкретного документа
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    comment: 'ID измененной сущности',
  },
  // ✅ РАСШИРЕННЫЙ: Добавлены административные действия
  action: {
    type: String,
    required: true,
    enum: [
      // Базовые действия
      'create', 'update', 'archive', 'restore', 'delete', 'complete', 'rollback', 'owner_change',
      // ✅ НОВЫЕ: Административные действия
      'role_change',      // Изменение роли пользователя
      'login',            // Вход в систему (для аудита безопасности)
      'permission_grant', // Предоставление прав доступа
      'permission_revoke',// Отзыв прав доступа
      'ban',              // Блокировка пользователя
      'unban',            // Разблокировка пользователя
      'password_reset',   // Сброс пароля (если будет)
      'session_terminate' // Принудительное завершение сессии
    ],
    comment: 'Тип выполненного действия',
  },
  // Объект, описывающий изменения
  changes: {
    type: Schema.Types.Mixed,
    comment: 'Объект, описывающий конкретные изменения',
  },
  // Дополнительный контекст
  context: {
    type: String,
    comment: 'Дополнительный контекст, например, "auth_system", "cli_script" или "system_job"',
  },
  // ✅ НОВЫЕ: Поля для безопасности административных действий
  ipAddress: {
    type: String,
    comment: 'IP адрес, с которого было совершено действие (для административных операций)',
  },
  userAgent: {
    type: String,
    comment: 'User-Agent браузера для анализа безопасности',
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }, // Нам важна только дата создания лога
  versionKey: false,
});

// ✅ НОВЫЕ: Индексы для административного аудита
auditLogSchema.index({ adminId: 1, timestamp: -1 }); // Для отчетов "кто и когда"
auditLogSchema.index({ entity: 1, action: 1 });
auditLogSchema.index({ ipAddress: 1 }); // Для анализа безопасности

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog; 