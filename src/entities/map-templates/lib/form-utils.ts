import type { MapTemplateFormValues } from '@/lib/api/schemas/map-templates/map-template-schemas';

/**
 * ✅ НОВОЕ: Утилита для построения FormData из данных формы
 * Переиспользуется в create и update мутациях
 */
export function buildMapTemplateFormData(data: MapTemplateFormValues): FormData {
  const formData = new FormData();
  
  // Обязательные поля
  formData.append('name', data.name);
  
  // Изображение - всегда добавляем для корректной валидации
  if (data.image instanceof File) {
    formData.append('image', data.image);
  } else if (typeof data.image === 'string') {
    formData.append('image', data.image);
  }
  
  // Опциональные поля
  if (data.description?.trim()) {
    formData.append('description', data.description.trim());
  }
  
  return formData;
} 