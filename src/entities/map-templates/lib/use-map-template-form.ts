import { useState, useCallback } from 'react';
import type { MapTemplateFormData, FormActionState } from '../ui/map-template-dialog';

interface UseMapTemplateFormProps {
  createAction: (prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  updateAction: (id: string, prevState: FormActionState, formData: FormData) => Promise<FormActionState>;
  onSuccess?: () => void;
}

/**
 * Упрощенный хук для управления формами шаблонов карт
 * Управляет состоянием формы и предоставляет колбэки для entities компонентов
 */
export function useMapTemplateForm({ 
  createAction, 
  updateAction, 
  onSuccess 
}: UseMapTemplateFormProps) {
  // Простое состояние загрузки
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Wrapper для создания
  const handleCreate = useCallback(
    async (data: MapTemplateFormData): Promise<FormActionState> => {
      setIsCreating(true);
      setErrors({});
      
      try {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('mapTemplateImage', data.mapTemplateImage);
        if (data.description) {
          formData.append('description', data.description);
        }

        const result = await createAction({ errors: {}, success: false }, formData);
        
        if (result.success && onSuccess) {
          onSuccess();
        } else {
          setErrors(result.errors);
        }
        
        return result;
      } finally {
        setIsCreating(false);
      }
    },
    [createAction, onSuccess]
  );

  // Wrapper для обновления
  const handleUpdate = useCallback(
    async (id: string, data: MapTemplateFormData): Promise<FormActionState> => {
      setIsUpdating(true);
      setErrors({});
      
      try {
        const formData = new FormData();
        formData.append('name', data.name);
        formData.append('mapTemplateImage', data.mapTemplateImage);
        if (data.description) {
          formData.append('description', data.description);
        }

        const result = await updateAction(id, { errors: {}, success: false }, formData);
        
        if (result.success && onSuccess) {
          onSuccess();
        } else {
          setErrors(result.errors);
        }
        
        return result;
      } finally {
        setIsUpdating(false);
      }
    },
    [updateAction, onSuccess]
  );

  return {
    // Колбэки для entities компонентов
    handleCreate,
    handleUpdate,
    
    // Состояния для UI
    isCreating,
    isUpdating,
    errors,
    
    // Вычисляемые состояния
    get isPending() {
      return isCreating || isUpdating;
    }
  };
} 