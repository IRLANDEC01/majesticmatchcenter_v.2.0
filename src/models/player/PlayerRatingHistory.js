import mongoose, { Schema } from 'mongoose';
import { RATING_CHANGE_REASONS } from '@/lib/constants';

const PlayerRatingHistorySchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
      comment: 'Ссылка на игрока, чей рейтинг изменился.',
    },
    map: {
      type: Schema.Types.ObjectId,
      ref: 'Map',
      required: true,
      index: true,
      comment: 'Ссылка на карту, в результате которой изменился рейтинг.',
    },
    previousRating: {
      type: Number,
      required: true,
      comment: 'Рейтинг игрока до изменения.',
    },
    newRating: {
      type: Number,
      required: true,
      comment: 'Рейтинг игрока после изменения.',
    },
    change: {
      type: Number,
      required: true,
      min: [0, 'Изменение рейтинга игрока не может быть отрицательным.'],
      comment: 'Абсолютное значение изменения рейтинга (всегда положительное).',
    },
    reason: {
      type: String,
      required: true,
      enum: Object.values(RATING_CHANGE_REASONS),
      default: RATING_CHANGE_REASONS.MAP_COMPLETION,
      comment: 'Причина изменения рейтинга.',
    },
  },
  {
    timestamps: true,
    collection: 'player_rating_history',
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.id;
      },
    },
  }
);

const PlayerRatingHistory =
  mongoose.models.PlayerRatingHistory || mongoose.model('PlayerRatingHistory', PlayerRatingHistorySchema);

export default PlayerRatingHistory; 