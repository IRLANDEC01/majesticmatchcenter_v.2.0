import mongoose, { Schema } from 'mongoose';

/**
 * @typedef {object} AuditLog
 * @property {mongoose.Types.ObjectId} [actorId] - ID пользователя, совершившего действие. Необязательно.
 * @property {string} entity - Тип сущности (например, 'TournamentTemplate').
 * @property {mongoose.Types.ObjectId} entityId - ID конкретного документа.
 * @property {('create'|'update'|'archive'|'restore'|'delete')} action - Тип действия.
 * @property {object} [changes] - Объект, описывающий изменения.
 * @property {string} [context] - Дополнительный контекст (например, 'system_job').
 * @property {Date} timestamp - Временная метка события.
 */

const auditLogSchema = new Schema({
  // ID пользователя, который совершил действие. Необязательно на начальном этапе.
  actorId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // 'User' - предполагаемое название будущей модели пользователя
    required: false,
    index: true,
    comment: 'ID пользователя, совершившего действие (если применимо)',
  },
  // Тип сущности, над которой было совершено действие (например, 'TournamentTemplate')
  entity: {
    type: String,
    required: true,
    index: true,
    comment: 'Тип сущности, над которой совершено действие',
  },
  // ID конкретного документа
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
    comment: 'ID измененной сущности',
  },
  // Тип действия (например, 'create', 'update', 'archive')
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'archive', 'restore', 'delete', 'complete', 'rollback', 'owner_change'],
    comment: 'Тип выполненного действия',
  },
  // Объект, описывающий изменения. Например, { isArchived: { from: false, to: true } }
  changes: {
    type: Schema.Types.Mixed,
    comment: 'Объект, описывающий конкретные изменения',
  },
  // Дополнительный контекст, полезный при отсутствии actorId
  context: {
    type: String,
    comment: 'Дополнительный контекст, например, "cli_script" или "system_job"',
  },
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }, // Нам важна только дата создания лога
  versionKey: false,
});

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog; 