'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys, mapTemplateKeys } from '@/shared/types/queries';
import { 
  createMapTemplateAction,
  updateMapTemplateAction,
  archiveMapTemplateAction,
  restoreMapTemplateAction,
  type ActionResult
} from '@/features/map-templates-management/api/actions.server';
import type { MapTemplateFormValues } from '@/lib/api/schemas/map-templates/map-template-schemas';
import { buildMapTemplateFormData } from './form-utils';

/**
 * ✅ ОБНОВЛЕНО: Хук для создания нового шаблона карты
 */
export function useCreateMapTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MapTemplateFormValues) => {
      const formData = buildMapTemplateFormData(data);
      const initialState: ActionResult = { success: false };
      const result = await createMapTemplateAction(initialState, formData);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'mapTemplates';
        }
      });
    },
    onError: (error: Error) => {
      console.error('Ошибка создания шаблона карты:', error);
      toast.error(error.message || 'Ошибка при создании шаблона карты');
    },
  });
}

/**
 * ✅ ОБНОВЛЕНО: Хук для обновления шаблона карты
 */
export function useUpdateMapTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MapTemplateFormValues }) => {
      const formData = buildMapTemplateFormData(data);
      const initialState: ActionResult = { success: false };
      const result = await updateMapTemplateAction(id, initialState, formData);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'mapTemplates';
        }
      });
    },
    onError: (error: Error) => {
      console.error('Ошибка обновления шаблона карты:', error);
      toast.error(error.message || 'Ошибка при обновлении шаблона карты');
    },
  });
}

/**
 * ✅ ОБНОВЛЕНО: Хук для архивирования с типизацией
 */
export function useArchiveMapTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResult, Error, string>({
    mutationFn: async (id: string) => {
      const result = await archiveMapTemplateAction(id);
      
      if (!result.success) {
        const errorMessage = result.errors?.general || result.errors?.permission || 'Ошибка при архивировании шаблона карты';
        throw new Error(errorMessage);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'mapTemplates';
        }
      });
    },
    onError: (error: Error) => {
      console.error('Ошибка архивирования шаблона карты:', error);
      toast.error(error.message || 'Ошибка при архивировании шаблона карты');
    },
  });
}

/**
 * ✅ ОБНОВЛЕНО: Хук для восстановления с типизацией
 */
export function useRestoreMapTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation<ActionResult, Error, string>({
    mutationFn: async (id: string) => {
      const result = await restoreMapTemplateAction(id);
      
      if (!result.success) {
        const errorMessage = result.errors?.general || result.errors?.permission || 'Ошибка при восстановлении шаблона карты';
        throw new Error(errorMessage);
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'mapTemplates';
        }
      });
    },
    onError: (error: Error) => {
      console.error('Ошибка восстановления шаблона карты:', error);
      toast.error(error.message || 'Ошибка при восстановлении шаблона карты');
    },
  });
} 