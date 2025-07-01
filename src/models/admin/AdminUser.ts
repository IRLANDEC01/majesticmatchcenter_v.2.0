import { Schema, model, models, type Document, type Model } from 'mongoose';

/**
 * Роли администраторов в системе
 */
export type AdminRole = 'super' | 'admin' | 'moderator' | 'pending';

/**
 * Интерфейс администратора
 */
export interface IAdminUser extends Document {
  /** Уникальный идентификатор пользователя в Яндекс ID */
  yandexId: string;
  /** Email адрес администратора - единственные PII-данные, которые храним */
  email: string;
  /** Роль в системе */
  role: AdminRole;
  /** Дата последнего входа */
  lastLoginAt?: Date;
  /** Метод обновления даты последнего входа */
  updateLastLogin(): Promise<IAdminUser>;
}

/**
 * Интерфейс для статических методов модели
 */
export interface IAdminUserModel extends Model<IAdminUser> {
  findByYandexId(yandexId: string): Promise<IAdminUser | null>;
  findByEmail(email: string): Promise<IAdminUser | null>;
  findByRole(role: AdminRole): Promise<IAdminUser[]>;
}

/**
 * Mongoose схема для администраторов
 */
const AdminUserSchema = new Schema<IAdminUser>({
  yandexId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    description: 'Уникальный идентификатор пользователя в Яндекс ID (profile.sub)'
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    description: 'Email адрес администратора'
  },
  role: {
    type: String,
    enum: ['super', 'admin', 'moderator', 'pending'],
    default: 'pending',
    required: true,
    description: 'Роль администратора в системе'
  },
  lastLoginAt: {
    type: Date,
    description: 'Дата последнего входа в систему'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }, // Только createdAt, без updatedAt
  collection: 'admin_users',
  versionKey: false
});

// ✅ Индексы для производительности
AdminUserSchema.index({ yandexId: 1 }, { unique: true });
AdminUserSchema.index({ email: 1 });
AdminUserSchema.index({ role: 1 });
AdminUserSchema.index({ lastLoginAt: -1 }); // Для отчетов по активности

/**
 * Виртуальные поля
 */
AdminUserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Убеждаемся, что виртуальные поля включены в JSON
AdminUserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

/**
 * Методы экземпляра
 */
AdminUserSchema.methods.updateLastLogin = function(this: IAdminUser) {
  this.lastLoginAt = new Date();
  return this.save();
};

/**
 * Статические методы - упрощенные для избежания TypeScript ошибок
 */
// AdminUserSchema.statics.findByYandexId = function(yandexId: string) {
//   return this.findOne({ yandexId });
// };

// AdminUserSchema.statics.findByEmail = function(email: string) {
//   return this.findOne({ email: email.toLowerCase() });
// };

// AdminUserSchema.statics.findByRole = function(role: AdminRole) {
//   return this.find({ role });
// };

/**
 * Middleware
 */
AdminUserSchema.pre('save', function(next) {
  // Нормализация email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

/**
 * Mongoose модель AdminUser
 */
export const AdminUser = models.AdminUser || model<IAdminUser>('AdminUser', AdminUserSchema);

export default AdminUser; 