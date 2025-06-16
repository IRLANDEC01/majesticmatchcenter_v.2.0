import mongoose from 'mongoose';

const familyRatingHistorySchema = new mongoose.Schema({
  // Ссылка на семью
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  // Рейтинг до изменения
  oldRating: {
    type: Number,
    required: true,
  },
  // Рейтинг после изменения
  newRating: {
    type: Number,
    required: true,
  },
  // Величина изменения (+15, 0 и т.д.)
  change: {
    type: Number,
    required: true,
    min: [0, 'Изменение рейтинга не может быть отрицательным.'],
  },
  // Причина изменения (для аудита)
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  // Ссылки на связанные сущности, если применимо
  related: {
    mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map' },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    // Можно добавить adminId, если изменение было ручным
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Нам важна только дата создания записи
  versionKey: '__v',
});

// Индекс для быстрого получения истории для конкретной семьи
familyRatingHistorySchema.index({ familyId: 1, createdAt: -1 });

const FamilyRatingHistory = mongoose.models.FamilyRatingHistory || mongoose.model('FamilyRatingHistory', familyRatingHistorySchema);

export default FamilyRatingHistory; 