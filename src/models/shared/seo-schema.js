import mongoose from 'mongoose';

/**
 * Переиспользуемая схема для SEO-полей (meta-title и meta-description).
 * Встраивается в основные модели, такие как Player, Family, Tournament, Map.
 */
const seoSchema = new mongoose.Schema({
  _id: false,
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO заголовок не должен превышать 60 символов.'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO описание не должно превышать 160 символов.'],
  },
});

export default seoSchema; 