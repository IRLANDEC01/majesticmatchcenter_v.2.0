// Model exports
export type { MapTemplate } from './model/types';
export { mapTemplateToUI, mapTemplatesToUI } from './model/mappers';

// UI Components  
export { MapTemplateDialog } from './ui/map-template-dialog';
export { MapTemplatesTable } from './ui/map-templates-table'; // ✅ Infinite scroll + виртуализация
// ✅ DEPRECATED: Серверная пагинация заменена на infinite scroll
// export { MapTemplatesTableServer } from './ui/map-templates-table-server';

// Data hooks
export { useMapTemplatesQuery } from './lib/use-map-templates-query'; // ✅ Для поиска
export { useInfiniteMapTemplatesQuery } from './lib/use-infinite-map-templates-query'; // ✅ Основной хук
// ✅ DEPRECATED: Серверная пагинация заменена на infinite scroll
// export { useMapTemplatesServerPagination } from './lib/use-map-templates-server-pagination';

// Mutation hooks
export { 
  useCreateMapTemplateMutation,
  useUpdateMapTemplateMutation,
  useArchiveMapTemplateMutation,
  useRestoreMapTemplateMutation
} from './lib/use-map-template-mutations';

// Form utilities
export { buildMapTemplateFormData } from './lib/form-utils';
