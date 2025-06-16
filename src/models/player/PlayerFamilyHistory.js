import mongoose from 'mongoose';

const playerFamilyHistorySchema = new mongoose.Schema({
  // Ссылка на игрока
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true,
  },
  // Ссылка на семью
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
  },
  // Дата вступления в семью
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  // Дата ухода из семьи (может быть пустой, если игрок все еще в семье)
  leftAt: {
    type: Date,
    default: null,
  },
  // Роль, которую игрок выполнял в этой семье
  role: {
    type: String,
    enum: ['leader', 'caller', 'scouter'],
    default: 'member',
  }
}, {
  timestamps: true,
  versionKey: '__v',
});

// Индекс для быстрого поиска истории по игроку и семье
playerFamilyHistorySchema.index({ playerId: 1, familyId: 1 });

const PlayerFamilyHistory = mongoose.models.PlayerFamilyHistory || mongoose.model('PlayerFamilyHistory', playerFamilyHistorySchema);

export default PlayerFamilyHistory; 