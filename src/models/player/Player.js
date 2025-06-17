import mongoose from 'mongoose';
import socialLinkSchema from '@/models/shared/social-link-schema.js';
import seoSchema from '@/models/shared/seo-schema.js';

const playerSchema = new mongoose.Schema({
  // Имя игрока. Только латиница, одно слово.
  firstName: {
    type: String,
    required: [true, 'Имя игрока является обязательным полем.'],
    trim: true,
    validate: {
      validator: (v) => /^[a-zA-Z]+$/.test(v),
      message: 'Имя может содержать только латинские буквы и быть одним словом.',
    },
  },
  // Фамилия игрока. Только латиница, одно слово.
  lastName: {
    type: String,
    required: [true, 'Фамилия игрока является обязательным полем.'],
    trim: true,
    validate: {
      validator: (v) => /^[a-zA-Z]+$/.test(v),
      message: 'Фамилия может содержать только латинские буквы и быть одним словом.',
    },
  },
  // Уникальный идентификатор для URL, генерируется из имени и фамилии
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  // URL на аватар игрока
  avatar: {
    type: String,
    trim: true,
    default: '/defaults/player-avatar.png', // Путь к аватару по умолчанию
  },
  // Краткая биография или описание игрока
  bio: {
    type: String,
    trim: true,
    maxlength: [5000, 'Биография не может превышать 5000 символов.'],
  },
  // Ссылка на текущую семью игрока. Может отсутствовать.
  currentFamily: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    default: null,
  },
  // Дата архивации игрока. Если значение `null` — игрок активен.
  // Если установлена дата — игрок считается удаленным (архивированным).
  // Этот подход используется для "мягкого удаления".
  archivedAt: {
    type: Date,
    default: null,
    index: true, // Индекс для быстрого отсеивания архивированных записей
  },
  // Социальные сети игрока
  socialLinks: [socialLinkSchema],
  // SEO-поля
  seo: seoSchema,
}, {
  timestamps: true,
  versionKey: '__v',
});

// Индексы для ускорения поиска.
// Уникальный составной индекс по имени и фамилии.
playerSchema.index({ firstName: 1, lastName: 1 }, { unique: true });

// Вспомогательная функция для капитализации
const capitalize = (s) => {
  if (typeof s !== 'string' || s.length === 0) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Хук для обработки данных перед валидацией
playerSchema.pre('validate', function(next) {
  // Капитализация имени и фамилии
  if (this.firstName) {
    this.firstName = capitalize(this.firstName);
  }
  if (this.lastName) {
    this.lastName = capitalize(this.lastName);
  }

  // Генерация slug из имени и фамилии, если они изменились или slug отсутствует
  if (this.isModified('firstName') || this.isModified('lastName') || !this.slug) {
    this.slug = `${this.firstName} ${this.lastName}`.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  
  next();
});

// Виртуальное поле для полного имени
playerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const Player = mongoose.models.Player || mongoose.model('Player', playerSchema);

export default Player; 