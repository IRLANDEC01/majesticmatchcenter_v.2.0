/**
 * @file Типы данных для сущности "Шаблоны карт", используемые в UI слое.
 */

import type { IImageSet } from "@/models/shared/image-set-schema";

/**
 * @description Представление шаблона карты в UI.
 * Отличается от IMapTemplate (Mongoose model) тем, что может содержать
 * только необходимые для отображения поля.
 */
export interface MapTemplate {
  id: string;
  name: string;
  description?: string | null;
  /** Набор публичных URL для отображения изображений. */
  imageUrls: IImageSet;
  isArchived: boolean;
  createdAt: string; // Даты обычно форматируются в строки для UI
  updatedAt: string;
} 