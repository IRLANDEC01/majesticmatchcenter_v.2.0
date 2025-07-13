import { Schema, model, models, type Document } from 'mongoose';
import type { Role } from '@/shared/lib/permissions';

/**
 * Интерфейс для пользователя системы (админ или обычный)
 */
export interface IUser extends Document {
  yandexId: string;    // Уникальный ID из Yandex OAuth
  email: string;       // Email пользователя
  role: Role;          // Роль: super | admin | moderator | user
  lastLoginAt?: Date;  // Дата последнего входа
}

/**
 * Mongoose-схема для пользователей
 */
const UserSchema = new Schema<IUser>({
  yandexId: {
    type: String,
    required: true,
    trim: true,
    description: 'Уникальный идентификатор пользователя в Яндекс ID (profile.sub)'
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    description: 'Email адрес пользователя'
  },
  role: {
    type: String,
    enum: ['super', 'admin', 'moderator', 'user'],
    required: true,
    default: 'user',
    description: 'Роль пользователя в системе'
  },
  lastLoginAt: {
    type: Date,
    description: 'Дата последнего входа в систему'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }, // Только createdAt, без updatedAt
  collection: 'users',
  versionKey: false
});

// ✅ Индексы для производительности
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ yandexId: 1 }, { unique: true });
/**
 * Виртуальные поля
 */
UserSchema.virtual('id').get(function() {
  return (this._id as any).toHexString();
});

// Убеждаемся, что виртуальные поля включены в JSON
UserSchema.set('toJSON', {
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
UserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

/**
 * Middleware
 */
UserSchema.pre('save', function(next) {
  // Нормализация email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

/**
 * Mongoose модель User
 */
const User = models.User || model<IUser>('User', UserSchema);

export default User; 