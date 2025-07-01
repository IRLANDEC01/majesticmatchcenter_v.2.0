import mongoose from 'mongoose';
import AuditLog from '@/models/audit/AuditLog';

/**
 * @interface IAuditLogData
 * @description Интерфейс для данных, передаваемых при создании записи в логе аудита.
 */
export interface IAuditLogData {
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'archive' | 'restore' | 'delete' | 'complete' | 'rollback' | 'owner_change' | 'role_change' | 'login' | 'permission_grant' | 'permission_revoke' | 'ban' | 'unban' | 'password_reset' | 'session_terminate';
  adminId?: mongoose.Types.ObjectId;
  changes?: Record<string, any>;
  context?: string;
  ipAddress?: string;
  userAgent?: string;
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
   * @returns {Promise<any>}
   */
  async create(logData: IAuditLogData): Promise<any> {
    const logEntry = new AuditLog(logData);
    await logEntry.save();
    return logEntry;
  }
}

const auditLogRepo = new AuditLogRepository();
Object.freeze(auditLogRepo);

export default auditLogRepo; 