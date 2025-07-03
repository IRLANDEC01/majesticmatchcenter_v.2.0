import { Schema, model, models, type Document } from 'mongoose';
import type { Role } from '@/shared/lib/permissions';

/**
 * Интерфейс для администратора в системе
 */
export interface IAdminUser extends Document {
  yandexId: string;    // Уникальный ID из Yandex OAuth
  email: string;       // Email администратора
  role: Role;          // Роль: super | admin | moderator
  lastLoginAt?: Date;  // Дата последнего входа
}

/**
 * Mongoose схема для администраторов
 */
const AdminUserSchema = new Schema<IAdminUser>({
  yandexId: {
    type: String,
    required: true,
    unique: true,
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
    enum: ['super', 'admin', 'moderator'],
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

/**
 * Виртуальные поля
 */
AdminUserSchema.virtual('id').get(function() {
  return (this._id as any).toHexString();
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
AdminUserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

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
const AdminUser = models.AdminUser || model<IAdminUser>('AdminUser', AdminUserSchema);

export default AdminUser; 