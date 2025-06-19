import mongoose, { Schema, models } from 'mongoose';

const PlayerEarningSchema = new Schema(
  {
    // Ссылка на игрока, получившего долю приза
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
      index: true,
    },
    // Ссылка на семью, в составе которой был получен приз
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
      index: true,
    },
    // Ссылка на турнир
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    // Валюта приза
    currency: {
      type: String,
      required: true,
      enum: ['RUB', 'USD', 'EUR'],
    },
    // Сумма (доля) приза
    amount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default models.PlayerEarning || mongoose.model('PlayerEarning', PlayerEarningSchema); 