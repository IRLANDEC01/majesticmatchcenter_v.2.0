import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * @typedef {object} FamilyMapParticipation
 * @property {mongoose.Types.ObjectId} familyId - ID семьи
 * @property {mongoose.Types.ObjectId} mapId - ID карты, в которой семья участвовала
 * @property {mongoose.Types.ObjectId} tournamentId - ID турнира, в рамках которого проходила карта
 * @property {number} ratingChange - Изменение рейтинга семьи по итогам карты. Может быть 0 или > 0.
 * @property {number} tournamentPoints - Количество очков, заработанных семьей в рамках турнира за эту карту.
 * @property {string} reason - Причина изменения рейтинга (например, 'map_completion').
 * @property {Date} earnedAt - Дата и время, когда был получен результат.
 */
const FamilyMapParticipationSchema = new Schema({
  familyId: {
    type: Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true,
    comment: 'ID семьи',
  },
  mapId: {
    type: Schema.Types.ObjectId,
    ref: 'Map',
    required: true,
    index: true,
    comment: 'ID карты, в которой семья участвовала',
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true,
    index: true,
    comment: 'ID турнира, в рамках которого проходила карта',
  },
  ratingChange: {
    type: Number,
    required: true,
    min: [0, 'Изменение рейтинга не может быть отрицательным.'],
    comment: 'Изменение рейтинга семьи по итогам карты. Может быть 0 или > 0.',
  },
  tournamentPoints: {
    type: Number,
    default: 0,
    min: [0, 'Количество турнирных очков не может быть отрицательным.'],
    comment: 'Количество очков, заработанных семьей в рамках турнира за эту карту.',
  },
  reason: {
    type: String,
    required: true,
    comment: 'Причина изменения рейтинга (например, \'map_completion\').',
  },
  earnedAt: {
    type: Date,
    default: Date.now,
    comment: 'Дата и время, когда был получен результат.',
  },
}, {
  timestamps: true,
  versionKey: false,
});

FamilyMapParticipationSchema.index({ familyId: 1, mapId: 1 }, { unique: true });

const FamilyMapParticipation = mongoose.models.FamilyMapParticipation || mongoose.model('FamilyMapParticipation', FamilyMapParticipationSchema);

export default FamilyMapParticipation; 