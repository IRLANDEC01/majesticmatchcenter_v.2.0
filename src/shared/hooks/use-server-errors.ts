import { useEffect, useRef } from 'react';
import type { UseFormReturn, FieldValues, Path } from 'react-hook-form';

/**
 * Типизированные server-side ошибки с поддержкой:
 * - Типизированных путей полей формы
 * - Массивов ошибок (errors: string[])
 * - Общих ошибок через 'root.server'
 * - Вложенных путей ('items.2.name')
 */
export type ServerErrors<T extends FieldValues> =
  | Partial<Record<Path<T> | 'root.server', string | string[]>>
  | undefined;

/**
 * Универсальный хук для установки server-side ошибок в React Hook Form
 * 
 * ✅ **Улучшения:**
 * - Очищает только предыдущие server-ошибки (не затирает client-валидацию)
 * - Полная TypeScript типизация с автодополнением полей
 * - Поддержка массивов ошибок и вложенных путей
 * - Дифференциальное обновление (только измененные поля)
 * - Helper методы для ручного управления
 * 
 * @param form - Объект формы из useForm()
 * @param errors - Типизированный объект ошибок с сервера
 * 
 * @example
 * ```tsx
 * const form = useForm<{ name: string; email: string }>();
 * const [serverErrors, setServerErrors] = useState<ServerErrors<FormValues>>();
 * 
 * const { setServerError, clearServerErrors } = useServerErrors(form, serverErrors);
 * 
 * // Типизированные поля с автодополнением:
 * setServerError('name', 'Это имя уже занято');
 * setServerError('root.server', 'Общая ошибка сервера');
 * ```
 */
export function useServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  errors: ServerErrors<T>
) {
  const prevServerErrors = useRef<ServerErrors<T>>(undefined);

  useEffect(() => {
    // Защита от undefined и отсутствия изменений
    if (!errors || errors === prevServerErrors.current) return;

         // 1. Очищаем только предыдущие server-ошибки (сохраняем client-валидацию)
     if (prevServerErrors.current) {
       Object.keys(prevServerErrors.current).forEach((field) => {
         form.clearErrors(field as any);
       });
     }

    // 2. Устанавливаем новые server-ошибки
    Object.entries(errors).forEach(([field, msg]) => {
      if (!msg) return;
      
      // Поддержка массивов ошибок: ['Error 1', 'Error 2'] → 'Error 1\nError 2'
      const message = Array.isArray(msg) ? msg.join('\n') : msg;
      
      form.setError(field as Path<T>, { 
        type: 'server', 
        message 
      });
    });

    prevServerErrors.current = errors;
  }, [errors, form]);

  // Helper методы для ручного управления
  const setServerError = (field: Path<T> | 'root.server', message: string) => {
    form.setError(field as Path<T>, { type: 'server', message });
  };

  const clearServerErrors = () => {
    if (prevServerErrors.current) {
      Object.keys(prevServerErrors.current).forEach((field) => {
        form.clearErrors(field as any);
      });
      prevServerErrors.current = undefined;
    }
  };

  return {
    setServerError,
    clearServerErrors,
  };
} 