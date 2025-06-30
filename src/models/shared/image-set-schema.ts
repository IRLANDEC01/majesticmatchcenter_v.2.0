import { Schema } from 'mongoose';

/**
 * Интерфейс для набора URL-адресов изображений разных размеров.
 * Используется во всех сущностях, имеющих изображения (карты, игроки, турниры).
 */
export interface IImageSet {
  /** URL иконки 64x64px для списков и миниатюр. */
  icon: string;
  /** URL изображения среднего размера (ширина 640px) для карточек. */
  medium: string;
  /** URL изображения оригинального размера (ширина 1920px) для детального просмотра. */
  original: string;
}

/**
 * Интерфейс для S3-ключей изображений.
 * Хранится для возможности удаления файлов из хранилища.
 */
export interface IImageKeys {
  /** S3-ключ иконки. */
  icon: string;
  /** S3-ключ изображения среднего размера. */
  medium: string;
  /** S3-ключ изображения оригинального размера. */
  original: string;
}

/**
 * Схема Mongoose для набора URL-адресов изображений.
 * Эти URL являются публичными и используются для отображения в UI.
 */
export const imageSetSchema = new Schema<IImageSet>(
  {
    icon: {
      type: String,
      required: [true, 'URL иконки обязателен.'],
      trim: true,
      comment: 'Публичный URL иконки 64x64px.',
    },
    medium: {
      type: String,
      required: [true, 'URL среднего изображения обязателен.'],
      trim: true,
      comment: 'Публичный URL изображения шириной 640px.',
    },
    original: {
      type: String,
      required: [true, 'URL оригинального изображения обязателен.'],
      trim: true,
      comment: 'Публичный URL изображения шириной 1920px.',
    },
  },
  {
    _id: false, // Не создавать отдельный _id для вложенного объекта.
    versionKey: false,
  }
);

/**
 * Схема Mongoose для S3-ключей изображений.
 * Используется внутренне для операций управления файлами, например, для удаления.
 */
export const imageKeysSchema = new Schema<IImageKeys>(
  {
    icon: {
      type: String,
      required: [true, 'S3-ключ иконки обязателен.'],
      trim: true,
      comment: 'S3-ключ для удаления иконки.',
    },
    medium: {
      type: String,
      required: [true, 'S3-ключ среднего изображения обязателен.'],
      trim: true,
      comment: 'S3-ключ для удаления среднего изображения.',
    },
    original: {
      type: String,
      required: [true, 'S3-ключ оригинального изображения обязателен.'],
      trim: true,
      comment: 'S3-ключ для удаления оригинального изображения.',
    },
  },
  {
    _id: false, // Не создавать отдельный _id для вложенного объекта.
    versionKey: false,
  }
); 