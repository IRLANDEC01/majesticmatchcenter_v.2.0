import mongoose from 'mongoose';

/**
 * Переиспользуемая схема для хранения статистики по конкретному виду оружия.
 * Эта схема встраивается в другие модели, такие как PlayerStats и PlayerMapParticipation.
 * @type {mongoose.Schema}
 */
const weaponStatSchema = new mongoose.Schema({
  _id: false, // Не создаем отдельный _id для subdocument
  weapon: { 
    type: String, 
    required: [true, 'Название оружия обязательно.'] 
  },
  shotsFired: { type: Number, default: 0 },
  hits: { type: Number, default: 0 },
  kills: { type: Number, default: 0 },
  damage: { type: Number, default: 0 },
  headshots: { type: Number, default: 0 },
  headshotAccuracy: { type: Number, default: 0 },
});

export default weaponStatSchema; 