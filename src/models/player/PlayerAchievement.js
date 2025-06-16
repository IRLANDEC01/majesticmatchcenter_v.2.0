import mongoose from 'mongoose';

const playerAchievementSchema = new mongoose.Schema({
  // Ссылка на игрока, получившего достижение
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true,
  },
  // Название достижения, например, "MVP Турнира"
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Краткое описание, например, "Лучший игрок летнего кубка Majestic"
  description: {
    type: String,
    trim: true,
  },
  // Тип достижения для фильтрации и отображения иконок
  type: {
    type: String,
    required: true,
    enum: [
      'map_mvp', 
      'map_top_kills', 
      'map_top_damage', 
      'tournament_winner', 
      'tournament_mvp', 
      'monthly_top_player', 
      'yearly_top_player'
    ],
  },
  // Ссылки на сущности, с которыми связано достижение
  related: {
    mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map' },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  },
  // Дата получения достижения
  earnedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  versionKey: '__v',
});

// Индекс для быстрого поиска достижений по типу
playerAchievementSchema.index({ playerId: 1, type: 1 });

const PlayerAchievement = mongoose.models.PlayerAchievement || mongoose.model('PlayerAchievement', playerAchievementSchema);

export default PlayerAchievement; 