import mongoose from 'mongoose';
import { CURRENCY_VALUES } from '@/lib/constants';

/**
 * Переиспользуемая схема для хранения информации о заработках.
 * Встраивается в PlayerStats и FamilyStats.
 */
const earningsSchema = new mongoose.Schema({
  _id: false,
  currency: {
    type: String,
    enum: {
      values: CURRENCY_VALUES,
      message: 'Валюта {VALUE} не поддерживается.',
    },
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
    min: [0, 'Сумма заработка не может быть отрицательной.'],
  }
});

export default earningsSchema; 