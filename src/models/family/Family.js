import mongoose from 'mongoose';
import socialLinkSchema from '../shared/social-link-schema.js';
import seoSchema from '../shared/seo-schema.js';
import earningsSchema from '../shared/earnings-schema.js';
import { FAMILY_MEMBER_ROLE_VALUES } from '../../lib/constants.js';
import slugify from 'slugify';

// Схема для текущих участников семьи.
// История членства будет в отдельной коллекции.
const memberSchema = new mongoose.Schema({
  _id: false,
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  // Роль указывается только если она особая.
  // Отсутствие роли означает "member".
  role: {
    type: String,
    enum: {
      values: FAMILY_MEMBER_ROLE_VALUES,
      message: '{VALUE} не является допустимой ролью.',
    },
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название семьи является обязательным полем.'],
    trim: true,
    validate: {
      validator: (v) => /^[a-zA-Z\\s]+$/.test(v),
      message: 'Название семьи должно содержать только латинские буквы и пробелы.',
    },
  },
  displayLastName: {
    type: String,
    required: [true, 'Фамилия для отображения является обязательной.'],
    trim: true,
    validate: {
      validator: (v) => /^[a-zA-Z]+$/.test(v),
      message: 'Фамилия для отображения может содержать только латинские буквы и быть одним словом.',
    },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Необходимо указать владельца семьи.'],
    index: true,
    comment: 'Владелец (основатель) семьи',
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Описание не может превышать 5000 символов.'],
  },
  logo: { type: String, trim: true },
  banner: { type: String, trim: true },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Рейтинг не может быть отрицательным.'],
    index: true,
  },
  // Дата архивации семьи. Если значение `null` — семья активна.
  // Если установлена дата — семья считается удаленной (архивированной).
  archivedAt: {
    type: Date,
    index: true,
  },
  // Суммарные заработки семьи за все время.
  earnings: [earningsSchema],
  members: [memberSchema],
  socialLinks: [socialLinkSchema],
  seo: seoSchema,
}, {
  timestamps: true,
  versionKey: '__v',
});

// Индексы
familySchema.index({ name: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
familySchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: { $eq: null } } });
familySchema.index({ name: 'text', description: 'text' }); // Для полнотекстового поиска

// Виртуальное поле, которое показывает, заархивирована ли семья.
familySchema.virtual('isArchived').get(function() {
  return this.archivedAt !== null && this.archivedAt !== undefined;
});

familySchema.pre('save', function (next) {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }
  next();
});

const Family = mongoose.models.Family || mongoose.model('Family', familySchema);

export default Family; 