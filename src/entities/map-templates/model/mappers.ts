import { IMapTemplate } from '@/models/map/MapTemplate';
import { MapTemplate } from './types';

/**
 * Преобразует Mongoose документ в frontend тип
 */
export function mapTemplateToDto(doc: IMapTemplate): MapTemplate {
  return {
    id: (doc._id as any).toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    mapTemplateImage: doc.mapTemplateImage,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    isArchived: Boolean(doc.archivedAt), // вычисляем из archivedAt
  };
}

/**
 * Преобразует массив Mongoose документов в frontend типы
 */
export function mapTemplatesToDto(docs: IMapTemplate[]): MapTemplate[] {
  return docs.map(mapTemplateToDto);
} 