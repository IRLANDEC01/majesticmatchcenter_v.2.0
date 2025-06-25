import mongoose from 'mongoose';
import AuditLog, { IAuditLog } from '@/models/audit/AuditLog';

/**
 * @interface IAuditLogData
 * @description Интерфейс для данных, передаваемых при создании записи в логе аудита.
 */
export interface IAuditLogData {
  entity: string;
  entityId: string;
  action: IAuditLog['action'];
  actorId?: mongoose.Types.ObjectId;
  changes?: Record<string, any>;
  context?: string;
}

/**
 * @class AuditLogRepository
 * @description Репозиторий для управления записями в логе аудита.
 * Реализован как синглтон.
 */
class AuditLogRepository {
  /**
   * Создает запись в логе аудита.
   * @param {IAuditLogData} logData - Данные для лога.
   * @returns {Promise<IAuditLog>}
   */
  async create(logData: IAuditLogData): Promise<IAuditLog> {
    const logEntry = new AuditLog(logData);
    await logEntry.save();
    return logEntry;
  }
}

const auditLogRepo = new AuditLogRepository();
Object.freeze(auditLogRepo);

export default auditLogRepo; 