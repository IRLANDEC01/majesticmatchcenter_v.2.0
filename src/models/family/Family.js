import mongoose from 'mongoose';
import socialLinkSchema from '@/models/shared/social-link-schema.js';
import seoSchema from '@/models/shared/seo-schema.js';

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
      values: ['leader', 'caller', 'scouter'],
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
    unique: true,
    trim: true,
    validate: {
      validator: (v) => /^[a-zA-Z\s]+$/.test(v),
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
  slug: {
    type: String,
    unique: true,
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
  // Дата архивации семьи. Если значение `null` — семья активна.
  // Если установлена дата — семья считается удаленной (архивированной).
  archivedAt: {
    type: Date,
    default: null,
    index: true,
  },
  members: [memberSchema],
  socialLinks: [socialLinkSchema],
  seo: seoSchema,
}, {
  timestamps: true,
  versionKey: '__v',
});

familySchema.index({ name: 'text', description: 'text' }); // Для полнотекстового поиска

familySchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  next();
});

const Family = mongoose.models.Family || mongoose.model('Family', familySchema);

export default Family; 