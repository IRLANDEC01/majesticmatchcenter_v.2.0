import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * @interface IAuditLog
 * @extends Document
 * @description Интерфейс для документа лога аудита.
 */
export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  entity: string;
  entityId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'archive' | 'restore' | 'delete' | 'complete' | 'rollback' | 'owner_change';
  changes?: Record<string, any>;
  context?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
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

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog; 