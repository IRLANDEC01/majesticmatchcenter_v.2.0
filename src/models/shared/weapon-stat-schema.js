import mongoose, { Schema } from 'mongoose';

/**
 * Переиспользуемая схема для хранения статистики по конкретному виду оружия.
 * Эта схема встраивается в другие модели, такие как PlayerStats и PlayerMapParticipation.
 * @type {mongoose.Schema}
 */
const weaponStatSchema = new Schema(
  {
    weapon: { type: String, required: true, comment: 'Название оружия.' },
    shotsFired: { type: Number, default: 0, comment: 'Произведено выстрелов.' },
    hits: { type: Number, default: 0, comment: 'Попаданий.' },
    kills: { type: Number, default: 0, comment: 'Убийств.' },
    damage: { type: Number, default: 0, comment: 'Нанесено урона.' },
    headshots: { type: Number, default: 0, comment: 'Попаданий в голову.' },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Точность попаданий (%)
weaponStatSchema.virtual('hitAccuracy').get(function () {
  if (!this.shotsFired || this.shotsFired === 0) {
    return 0;
  }
  return parseFloat(((this.hits / this.shotsFired) * 100).toFixed(2));
});

// Процент хедшотов от всех попаданий (%)
weaponStatSchema.virtual('headshotAccuracy').get(function () {
  if (!this.hits || this.hits === 0) {
    return 0;
  }
  return parseFloat(((this.headshots / this.hits) * 100).toFixed(2));
});

export default weaponStatSchema; 