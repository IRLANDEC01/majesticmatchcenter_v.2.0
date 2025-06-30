import type { IMapTemplate } from '@/models/map/MapTemplate';
import type { MapTemplate } from './types';

/**
 * Преобразует Mongoose документ в UI тип
 */
export function mapTemplateToUI(doc: IMapTemplate): MapTemplate {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description ?? null,
    imageUrls: doc.imageUrls,
    isArchived: doc.archivedAt != null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

/**
 * Преобразует массив Mongoose документов в UI типы
 */
export function mapTemplatesToUI(docs: IMapTemplate[]): MapTemplate[] {
  return docs.map(mapTemplateToUI);
} 
