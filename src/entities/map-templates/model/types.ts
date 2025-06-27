// Базовые типы для сущности MapTemplate
export interface MapTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  mapTemplateImage: string;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
}

// DTO для создания
export interface CreateMapTemplateDto {
  name: string;
  mapTemplateImage: string;
  description?: string;
}

// DTO для обновления
export interface UpdateMapTemplateDto {
  name?: string;
  mapTemplateImage?: string;
  description?: string;
} 